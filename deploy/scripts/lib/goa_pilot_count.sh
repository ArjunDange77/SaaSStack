# shellcheck shell=bash
# Count Goa pilot students via operator dashboard (requires API_URL + credentials in env).

goa_pilot_student_count() {
  python3 - <<'PY'
import json
import os
import urllib.request

api = os.environ["API_URL"].rstrip("/")
tenant = os.environ.get("GOA_TENANT", "sai-baba-school-bus")
user = os.environ.get("GOA_USER", "kamlesh")
password = os.environ.get("GOA_PASSWORD", "admin")

try:
    login_req = urllib.request.Request(
        f"{api}/api/auth/login/",
        data=json.dumps({"username": user, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(login_req, timeout=60) as resp:
        token = json.load(resp)["access"]
    dash_req = urllib.request.Request(
        f"{api}/api/sb/operator/dashboard/",
        headers={"Authorization": f"Bearer {token}", "X-Tenant": tenant},
    )
    with urllib.request.urlopen(dash_req, timeout=60) as resp:
        print(int(json.load(resp).get("total_students", 0)))
except Exception:
    print(0)
PY
}

assert_goa_pilot_min_students() {
  local api_url=$1
  local min=${GOA_MIN_STUDENTS:-15}
  export API_URL="$api_url"
  export GOA_TENANT="${GOA_TENANT:-sai-baba-school-bus}"
  export GOA_USER="${GOA_USER:-kamlesh}"
  export GOA_PASSWORD="${GOA_PASSWORD:-admin}"
  local total
  total="$(goa_pilot_student_count)"
  if [[ "$total" -lt "$min" ]]; then
    echo "ERROR: Goa pilot has ${total} students (need >= ${min}) for ${GOA_USER} @ ${GOA_TENANT}" >&2
    return 1
  fi
  echo "Goa pilot OK: ${total} students (minimum ${min})"
  return 0
}
