import sys, json
try:
    raw = sys.stdin.read()
    data = json.loads(raw) if raw else {}
    response = {"status": "success", "received": data, "echo": "تمت المعالجة بواسطة بايثون بنجاح"}
    print(json.dumps(response, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"error": str(e)}, ensure_ascii=False))
