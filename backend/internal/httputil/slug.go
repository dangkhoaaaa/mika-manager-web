package httputil

import (
	"regexp"
	"strings"

	"github.com/google/uuid"
)

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func Slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		return "project"
	}
	return s
}

func NewAPIKey() string {
	return "mika_" + strings.ReplaceAll(uuid.New().String(), "-", "")
}
