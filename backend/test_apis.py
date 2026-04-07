import urllib.request, json

print("1. Testing Extraction...")
r = urllib.request.urlopen("http://127.0.0.1:5000/api/meetings/6/extraction", timeout=30)
d = json.loads(r.read())
print(f"   Decisions: {len(d['decisions'])}, Actions: {len(d['actions'])}")

print("2. Testing Sentiment...")
r = urllib.request.urlopen("http://127.0.0.1:5000/api/meetings/6/sentiment", timeout=30)
d = json.loads(r.read())
print(f"   Label: {d['overall_label']}, Segments: {len(d['segments'])}, Speakers: {len(d['speakers'])}")

print("3. Testing Chat...")
data = json.dumps({"message": "hi"}).encode()
req = urllib.request.Request("http://127.0.0.1:5000/api/projects/5/chat", data=data, headers={"Content-Type": "application/json"})
r = urllib.request.urlopen(req, timeout=60)
d = json.loads(r.read())
print(f"   Reply: {d['content'][:100]}")

print("\nALL 3 FEATURES WORKING!")
