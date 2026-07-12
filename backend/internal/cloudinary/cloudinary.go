package cloudinary

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"sort"
	"strings"
	"time"
)

type Client struct {
	CloudName string
	APIKey    string
	APISecret string
}

type UploadResult struct {
	URL      string `json:"secure_url"`
	PublicID string `json:"public_id"`
	Format   string `json:"format"`
	Bytes    int64  `json:"bytes"`
}

func New(cloudName, apiKey, apiSecret string) *Client {
	return &Client{
		CloudName: cloudName,
		APIKey:    apiKey,
		APISecret: apiSecret,
	}
}

func (c *Client) Enabled() bool {
	return c.CloudName != "" && c.APIKey != "" && c.APISecret != ""
}

func (c *Client) Upload(ctx context.Context, file multipart.File, filename, folder string) (*UploadResult, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("cloudinary not configured")
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	params := map[string]string{
		"timestamp": timestamp,
		"folder":    folder,
	}

	sig := c.sign(params)
	_ = writer.WriteField("api_key", c.APIKey)
	_ = writer.WriteField("timestamp", timestamp)
	_ = writer.WriteField("signature", sig)
	_ = writer.WriteField("folder", folder)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(part, file); err != nil {
		return nil, err
	}
	writer.Close()

	url := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/auto/upload", c.CloudName)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("cloudinary upload failed: %s", string(body))
	}

	var result UploadResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) sign(params map[string]string) string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var parts []string
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", k, params[k]))
	}
	toSign := strings.Join(parts, "&") + c.APISecret
	h := sha1.Sum([]byte(toSign))
	return hex.EncodeToString(h[:])
}

func (c *Client) Delete(ctx context.Context, publicID string) error {
	if !c.Enabled() || publicID == "" {
		return nil
	}

	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	params := map[string]string{
		"public_id": publicID,
		"timestamp": timestamp,
	}
	sig := c.sign(params)

	url := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/destroy", c.CloudName)
	data := fmt.Sprintf("public_id=%s&timestamp=%s&api_key=%s&signature=%s",
		publicID, timestamp, c.APIKey, sig)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, strings.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	return nil
}
