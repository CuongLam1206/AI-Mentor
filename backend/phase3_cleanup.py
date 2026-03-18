"""
Cleanup script: Remove orphan broken Phase 3 code from server.py.
The orphan block has lines with escaped backslash-quote patterns like: \\\"
"""
import re

filepath = r'e:\Learnify_Mentor_AI\backend\server.py'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find the second occurrence of WebSocket endpoint header
ws_header_count = 0
delete_start = None
delete_end = None

for i, line in enumerate(lines):
    # Look for lines with escaped quotes - these are the broken lines
    if '\\"' in line and delete_start is None:
        # Check if this is in the orphan block (after line 590)
        if i > 585:
            delete_start = i
            print(f"Found start of broken block at line {i+1}: {line.rstrip()[:80]}")
    
    # The broken block ends just before the real @app.websocket("/ws/chat/
    if delete_start is not None and '@app.websocket("/ws/chat/{session_id}")' in line:
        delete_end = i
        print(f"Found end of broken block at line {i+1}")
        break

if delete_start is not None and delete_end is not None:
    print(f"Deleting lines {delete_start+1} to {delete_end} ({delete_end - delete_start} lines)")
    new_lines = lines[:delete_start] + ['\n'] + lines[delete_end:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"Done! New total lines: {len(new_lines)}")
elif delete_start is None:
    print("No broken lines found - might already be clean!")
else:
    print(f"Found start at {delete_start+1} but no end. Showing context:")
    for i in range(delete_start, min(delete_start+20, len(lines))):
        print(f"  {i+1}: {lines[i].rstrip()[:100]}")
