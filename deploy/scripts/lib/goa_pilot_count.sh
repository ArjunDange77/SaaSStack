# shellcheck shell=bash
# Count Goa pilot students via operator dashboard (requires API_URL + credentials in env).

goa_pilot_student_count() {
  local api tenant user password token
  api="${API_URL%/}"
  tenant="${GOA_TENANT:-sai-baba-school-bus}"
  user="${GOA_USER:-kamlesh}"
  password="${GOA_PASSWORD:-admin}"

  token="$(curl -sf -X POST "${api}/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${user}\",\"password\":\"${password}\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access',''))" 2>/dev/null || true)"
  if [[ -z "$token" ]]; then
    echo "WARN: Goa pilot login failed for ${user} @ ${tenant}" >&2
    echo 0
    return 0
  fi

  local count
  count="$(curl -sf \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant: ${tenant}" \
    "${api}/api/sb/operator/dashboard/" \
    | python3 -c "import sys,json; print(int(json.load(sys.stdin).get('total_students', 0)))" 2>/dev/null || echo 0)"

  if [[ -z "$count" || "$count" == "0" ]]; then
    # Fallback: briefing embeds dashboard totals (same auth path as smoke_schoolbus_staging.sh)
    count="$(curl -sf \
      -H "Authorization: Bearer ${token}" \
      -H "X-Tenant: ${tenant}" \
      "${api}/api/sb/operator/briefing/" \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d.get('dashboard',{}).get('total_students', 0)))" 2>/dev/null || echo 0)"
  fi

  echo "${count:-0}"
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
    echo "  Hint: run ensure_staging_goa_pilot_seed.sh or Deploy Staging with run_goa_pilot_seed." >&2
    return 1
  fi
  echo "Goa pilot OK: ${total} students (minimum ${min})"
  return 0
}
