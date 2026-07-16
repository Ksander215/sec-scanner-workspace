// Package si provides the official Go SDK for the Security Intelligence Platform REST API.
package si

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// ApiError represents an error from the SI Platform API.
type ApiError struct {
	StatusCode int
	Message    string
}

func (e *ApiError) Error() string {
	return fmt.Sprintf("API Error %d: %s", e.StatusCode, e.Message)
}

// Config holds the SDK configuration.
type Config struct {
	BaseURL   string
	AuthToken string
	APIKey    string
	Timeout   time.Duration
}

// Client is the official Go SDK client for the Security Intelligence Platform.
type Client struct {
	baseURL    string
	authToken  string
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new SDK client.
func NewClient(config Config) *Client {
	timeout := config.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}
	return &Client{
		baseURL:   config.BaseURL,
		authToken: config.AuthToken,
		apiKey:    config.APIKey,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) doRequest(ctx context.Context, method, path string, body interface{}) (map[string]interface{}, error) {
	u, _ := url.JoinPath(c.baseURL, path)

	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, u, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		var errResp map[string]interface{}
		json.Unmarshal(data, &errResp)
		msg, _ := errResp["message"].(string)
		return nil, &ApiError{StatusCode: resp.StatusCode, Message: msg}
	}

	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result, nil
}

// AnalyzeSync runs a synchronous analysis.
func (c *Client) AnalyzeSync(ctx context.Context, findings []map[string]interface{}) (map[string]interface{}, error) {
	body := map[string]interface{}{"findings": findings}
	return c.doRequest(ctx, "POST", "/api/v1/analyze/sync", body)
}

// GetReport retrieves a report by ID.
func (c *Client) GetReport(ctx context.Context, reportID string) (map[string]interface{}, error) {
	return c.doRequest(ctx, "GET", "/api/v1/reports/"+reportID, nil)
}

// ListReports lists all reports.
func (c *Client) ListReports(ctx context.Context, limit, offset int) (map[string]interface{}, error) {
	return c.doRequest(ctx, "GET", fmt.Sprintf("/api/v1/reports?limit=%d&offset=%d", limit, offset), nil)
}

// DeleteReport deletes a report by ID.
func (c *Client) DeleteReport(ctx context.Context, reportID string) error {
	_, err := c.doRequest(ctx, "DELETE", "/api/v1/reports/"+reportID, nil)
	return err
}

// ListFindings lists findings for a report.
func (c *Client) ListFindings(ctx context.Context, reportID string, limit, offset int) (map[string]interface{}, error) {
	return c.doRequest(ctx, "GET", fmt.Sprintf("/api/v1/findings?reportId=%s&limit=%d&offset=%d", reportID, limit, offset), nil)
}

// ListRisks lists risks for a report.
func (c *Client) ListRisks(ctx context.Context, reportID string) (map[string]interface{}, error) {
	return c.doRequest(ctx, "GET", "/api/v1/risks?reportId="+reportID, nil)
}

// GetRiskSummary returns risk summary for a report.
func (c *Client) GetRiskSummary(ctx context.Context, reportID string) (map[string]interface{}, error) {
	return c.doRequest(ctx, "GET", "/api/v1/risks/summary?reportId="+reportID, nil)
}

// ListAttackPaths lists attack paths for a report.
func (c *Client) ListAttackPaths(ctx context.Context, reportID string) (map[string]interface{}, error) {
	return c.doRequest(ctx, "GET", "/api/v1/attack-paths?reportId="+reportID, nil)
}

// ListRecommendations lists recommendations for a report.
func (c *Client) ListRecommendations(ctx context.Context, reportID string) (map[string]interface{}, error) {
	return c.doRequest(ctx, "GET", "/api/v1/recommendations?reportId="+reportID, nil)
}

// GetHealth checks the platform health.
func (c *Client) GetHealth(ctx context.Context) (map[string]interface{}, error) {
	return c.doRequest(ctx, "GET", "/health", nil)
}

// CreateSnapshot creates a snapshot of a report.
func (c *Client) CreateSnapshot(ctx context.Context, reportID string, description string) (map[string]interface{}, error) {
	return c.doRequest(ctx, "POST", "/api/v1/snapshots", map[string]string{"reportId": reportID, "description": description})
}
