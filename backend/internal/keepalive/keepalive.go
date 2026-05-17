package keepalive

import (
	"log"
	"net/http"
	"strings"
	"time"
)

// Start pings the public wake endpoint every ~14 minutes so Render free tier
// does not spin down while the process is still running.
func Start(publicAPIURL string) {
	base := strings.TrimRight(strings.TrimSpace(publicAPIURL), "/")
	if base == "" {
		return
	}

	wakeURL := base + "/wake"
	log.Printf("keepalive: pinging %s every 14m", wakeURL)

	go func() {
		ping := func() {
			client := &http.Client{Timeout: 30 * time.Second}
			resp, err := client.Get(wakeURL)
			if err != nil {
				log.Printf("keepalive: %v", err)
				return
			}
			_ = resp.Body.Close()
		}

		// First ping shortly after boot (cold start may still be waking).
		time.AfterFunc(30*time.Second, ping)

		ticker := time.NewTicker(14 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			ping()
		}
	}()
}
