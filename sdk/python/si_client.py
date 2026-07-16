"""Security Intelligence Platform — Official Python SDK"""
import json
import uuid
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urlencode


class SiApiError(Exception):
    """API error from Security Intelligence Platform"""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"API Error {status_code}: {message}")


class SecurityIntelligenceClient:
    """Official Python SDK for the Security Intelligence Platform REST API"""

    def __init__(self, base_url: str, auth_token: Optional[str] = None,
                 api_key: Optional[str] = None, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.api_key = api_key
        self.timeout = timeout

    def _request(self, method: str, path: str, body: Optional[Dict] = None) -> Any:
        url = f"{self.base_url}{path}"
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        data = json.dumps(body).encode() if body else None
        req = Request(url, data=data, headers=headers, method=method)

        try:
            with urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read().decode())
        except HTTPError as e:
            error_body = e.read().decode()
            try:
                error_data = json.loads(error_body)
                raise SiApiError(e.code, error_data.get("message", str(e)))
            except json.JSONDecodeError:
                raise SiApiError(e.code, str(e))

    def analyze(self, findings: List[Dict], **options) -> Dict:
        body = {"findings": findings, "options": options if options else None}
        return self._request("POST", "/api/v1/analyze", body)

    def analyze_sync(self, findings: List[Dict], **options) -> Dict:
        body = {"findings": findings, "options": options if options else None}
        return self._request("POST", "/api/v1/analyze/sync", body)

    def list_reports(self, limit: int = 100, offset: int = 0) -> Dict:
        return self._request("GET", f"/api/v1/reports?limit={limit}&offset={offset}")

    def get_report(self, report_id: str) -> Dict:
        return self._request("GET", f"/api/v1/reports/{report_id}")

    def delete_report(self, report_id: str) -> Dict:
        return self._request("DELETE", f"/api/v1/reports/{report_id}")

    def list_findings(self, report_id: str, limit: int = 100, offset: int = 0) -> Dict:
        return self._request("GET", f"/api/v1/findings?reportId={report_id}&limit={limit}&offset={offset}")

    def search_findings(self, query: str, limit: int = 100, offset: int = 0) -> Dict:
        return self._request("GET", f"/api/v1/findings/search?q={urlencode({'q': query})}&limit={limit}&offset={offset}")

    def list_risks(self, report_id: str) -> Dict:
        return self._request("GET", f"/api/v1/risks?reportId={report_id}")

    def get_risk_summary(self, report_id: str) -> Dict:
        return self._request("GET", f"/api/v1/risks/summary?reportId={report_id}")

    def get_top_risks(self, limit: int = 10) -> Dict:
        return self._request("GET", f"/api/v1/risks/top?limit={limit}")

    def list_attack_paths(self, report_id: str) -> Dict:
        return self._request("GET", f"/api/v1/attack-paths?reportId={report_id}")

    def list_recommendations(self, report_id: str) -> Dict:
        return self._request("GET", f"/api/v1/recommendations?reportId={report_id}")

    def create_remediation_plan(self, report_id: str) -> Dict:
        return self._request("POST", "/api/v1/recommendations/plan", {"reportId": report_id})

    def list_explanations(self, report_id: str) -> Dict:
        return self._request("GET", f"/api/v1/explanations?reportId={report_id}")

    def get_explanation(self, target_id: str) -> Dict:
        return self._request("GET", f"/api/v1/explanations/{target_id}")

    def get_health(self) -> Dict:
        return self._request("GET", "/health")

    def create_snapshot(self, report_id: str, description: Optional[str] = None) -> Dict:
        return self._request("POST", "/api/v1/snapshots", {"reportId": report_id, "description": description})

    def restore_snapshot(self, snapshot_id: str) -> Dict:
        return self._request("POST", f"/api/v1/snapshots/{snapshot_id}/restore")
