import json, os
with open("benchmark-fixed.json", "rb") as bf:
    text = bf.read().decode("latin-1")
    data = json.loads(text)
    print("Parse OK, lines:", len(data["results"]))
    for r in data["results"]:
        vals = [str(v) for k, v in r.get("metrics", {}).items() if isinstance(v, str)]
        if "~" in v:
            print(f"TILL: {r["name"]}: {v}")
    print("Parse OK, ~ count:", sum(1 for _ in data["results"]))
