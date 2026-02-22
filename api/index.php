<?php
// Memoir App - PHP API Router
// Replaces the Express/Node.js backend for shared hosting (Bluehost)

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// --- Helpers ---

function ensureDir($dir) {
    if (!is_dir($dir)) mkdir($dir, 0755, true);
}

function projectDir($id) {
    return DATA_DIR . '/' . $id;
}

function readJSON($path, $fallback = null) {
    if (!file_exists($path)) return $fallback;
    $data = json_decode(file_get_contents($path), true);
    return $data !== null ? $data : $fallback;
}

function writeJSON($path, $data) {
    ensureDir(dirname($path));
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function sendJSON($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function sendError($msg, $code = 400) {
    sendJSON(['error' => $msg], $code);
}

function getBody() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function validateId($id) {
    return preg_match('/^\d+$/', $id);
}

function nowISO() {
    return gmdate('Y-m-d\TH:i:s.') . sprintf('%03d', (int)(microtime(true) * 1000) % 1000) . 'Z';
}

// --- Migration (flat data/ → project subdirectories) ---

function migrateIfNeeded() {
    $oldProject = DATA_DIR . '/project.json';
    if (!file_exists($oldProject)) return;

    $proj = json_decode(file_get_contents($oldProject), true);
    $id = (string)round(microtime(true) * 1000);
    $dir = projectDir($id);
    ensureDir($dir);

    $proj['id'] = $id;
    writeJSON($dir . '/project.json', $proj);

    foreach (['memories.json', 'chapters.json'] as $f) {
        $src = DATA_DIR . '/' . $f;
        if (file_exists($src)) {
            copy($src, $dir . '/' . $f);
            unlink($src);
        }
    }
    unlink($oldProject);
}

// --- Projects ---

function listProjects() {
    ensureDir(DATA_DIR);
    $projects = [];
    foreach (scandir(DATA_DIR) as $entry) {
        if ($entry === '.' || $entry === '..' || $entry === '.htaccess') continue;
        $path = DATA_DIR . '/' . $entry;
        if (!is_dir($path)) continue;
        $proj = readJSON($path . '/project.json');
        if ($proj) {
            $proj['id'] = $entry;
            $projects[] = $proj;
        }
    }
    usort($projects, function($a, $b) {
        return strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? '');
    });
    sendJSON($projects);
}

function createProject() {
    $body = getBody();
    $id = (string)round(microtime(true) * 1000);
    $project = array_merge([
        'id' => $id,
        'createdAt' => nowISO(),
        'interviewStage' => 0,
        'interviewQuestion' => 0,
    ], $body);
    $dir = projectDir($id);
    ensureDir($dir);
    writeJSON($dir . '/project.json', $project);
    writeJSON($dir . '/memories.json', []);
    writeJSON($dir . '/chapters.json', []);
    sendJSON($project);
}

function getProject($id) {
    $proj = readJSON(projectDir($id) . '/project.json');
    if (!$proj) sendError('Project not found', 404);
    $proj['id'] = $id;
    sendJSON($proj);
}

function updateProject($id) {
    $file = projectDir($id) . '/project.json';
    $existing = readJSON($file, []);
    $updated = array_merge($existing, getBody(), ['id' => $id]);
    writeJSON($file, $updated);
    sendJSON($updated);
}

function deleteProject($id) {
    $dir = projectDir($id);
    if (is_dir($dir)) {
        foreach (glob($dir . '/*') as $f) {
            if (is_file($f)) unlink($f);
        }
        rmdir($dir);
    }
    sendJSON(['ok' => true]);
}

// --- Memories ---

function getMemories($projectId) {
    sendJSON(readJSON(projectDir($projectId) . '/memories.json', []));
}

function createMemory($projectId) {
    $file = projectDir($projectId) . '/memories.json';
    $memories = readJSON($file, []);
    $memory = array_merge([
        'id' => (string)round(microtime(true) * 1000),
        'createdAt' => nowISO(),
    ], getBody());
    $memories[] = $memory;
    writeJSON($file, $memories);
    sendJSON($memory);
}

function updateMemory($projectId, $memoryId) {
    $file = projectDir($projectId) . '/memories.json';
    $memories = readJSON($file, []);
    $idx = null;
    foreach ($memories as $i => $m) {
        if ($m['id'] === $memoryId) { $idx = $i; break; }
    }
    if ($idx === null) sendError('Not found', 404);
    $memories[$idx] = array_merge($memories[$idx], getBody(), ['updatedAt' => nowISO()]);
    writeJSON($file, $memories);
    sendJSON($memories[$idx]);
}

function deleteMemory($projectId, $memoryId) {
    $file = projectDir($projectId) . '/memories.json';
    $memories = readJSON($file, []);
    $memories = array_values(array_filter($memories, function($m) use ($memoryId) {
        return $m['id'] !== $memoryId;
    }));
    writeJSON($file, $memories);
    sendJSON(['ok' => true]);
}

// --- Chapters ---

function getChapters($projectId) {
    sendJSON(readJSON(projectDir($projectId) . '/chapters.json', []));
}

function createChapter($projectId) {
    $file = projectDir($projectId) . '/chapters.json';
    $chapters = readJSON($file, []);
    $chapter = array_merge([
        'id' => (string)round(microtime(true) * 1000),
        'memoryIds' => [],
        'content' => '',
        'createdAt' => nowISO(),
    ], getBody());
    $chapters[] = $chapter;
    writeJSON($file, $chapters);
    sendJSON($chapter);
}

function reorderChapters($projectId) {
    $file = projectDir($projectId) . '/chapters.json';
    $chapters = readJSON($file, []);
    $order = getBody()['order'] ?? [];
    $sorted = [];
    foreach ($order as $id) {
        foreach ($chapters as $c) {
            if ($c['id'] === $id) { $sorted[] = $c; break; }
        }
    }
    foreach ($chapters as $c) {
        if (!in_array($c['id'], $order)) $sorted[] = $c;
    }
    writeJSON($file, $sorted);
    sendJSON($sorted);
}

function updateChapter($projectId, $chapterId) {
    $file = projectDir($projectId) . '/chapters.json';
    $chapters = readJSON($file, []);
    $idx = null;
    foreach ($chapters as $i => $c) {
        if ($c['id'] === $chapterId) { $idx = $i; break; }
    }
    if ($idx === null) sendError('Not found', 404);
    $chapters[$idx] = array_merge($chapters[$idx], getBody(), ['updatedAt' => nowISO()]);
    writeJSON($file, $chapters);
    sendJSON($chapters[$idx]);
}

function deleteChapter($projectId, $chapterId) {
    $file = projectDir($projectId) . '/chapters.json';
    $chapters = readJSON($file, []);
    $chapters = array_values(array_filter($chapters, function($c) use ($chapterId) {
        return $c['id'] !== $chapterId;
    }));
    writeJSON($file, $chapters);
    sendJSON(['ok' => true]);
}

// --- AI Proxy (Anthropic API via curl) ---

function aiRequest($systemPrompt, $userContent) {
    if (empty(ANTHROPIC_API_KEY) || ANTHROPIC_API_KEY === 'your-api-key-here') {
        return ['error' => 'API key not configured. Set ANTHROPIC_API_KEY in api/config.php'];
    }

    $payload = json_encode([
        'model' => 'claude-sonnet-4-5-20250929',
        'max_tokens' => 2048,
        'system' => $systemPrompt,
        'messages' => [['role' => 'user', 'content' => $userContent]],
    ]);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . ANTHROPIC_API_KEY,
            'anthropic-version: 2023-06-01',
        ],
        CURLOPT_TIMEOUT => 60,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) return ['error' => 'API request failed: ' . $err];

    $data = json_decode($response, true);
    if ($httpCode !== 200) {
        return ['error' => $data['error']['message'] ?? 'Unknown API error'];
    }
    return ['text' => $data['content'][0]['text'] ?? ''];
}

function aiExpand($projectId) {
    $body = getBody();
    $ctx = !empty($body['memories']) ? "\n\nReference memories:\n" . $body['memories'] : '';
    sendJSON(aiRequest(
        'You are a warm, skilled memoir ghostwriter. Expand the following notes into vivid, first-person narrative prose suitable for a memoir. Maintain the author\'s voice. Be descriptive and emotionally resonant but not overwrought. Write 2-4 paragraphs.',
        ($body['text'] ?? '') . $ctx
    ));
}

function aiDraftOpening($projectId) {
    $body = getBody();
    $ctx = !empty($body['memories']) ? $body['memories'] : 'No specific memories provided.';
    sendJSON(aiRequest(
        'You are a warm, skilled memoir ghostwriter. Write an opening draft for a memoir chapter. Use the chapter title and reference memories to craft a compelling, first-person narrative opening. Set the scene, draw the reader in, and weave in details from the memories naturally. Write 3-5 paragraphs. Be vivid but authentic — this is someone\'s real life.',
        'Chapter title: ' . ($body['title'] ?? 'Untitled') . "\n\nReference memories:\n" . $ctx
    ));
}

function aiPolish($projectId) {
    $body = getBody();
    sendJSON(aiRequest(
        'You are a gentle, skilled memoir editor. Polish the following memoir text for clarity, flow, and emotional resonance. Preserve the author\'s voice and style. Fix grammar and awkward phrasing. Return only the improved text.',
        $body['text'] ?? ''
    ));
}

function aiFollowUp($projectId) {
    $body = getBody();
    sendJSON(aiRequest(
        'You are a warm interviewer helping someone write their memoir. Based on their answer to a question, generate 3 thoughtful follow-up questions that dig deeper into the memory. Be specific and evocative. Format as a numbered list.',
        "Original question: " . ($body['question'] ?? '') . "\n\nTheir answer: " . ($body['answer'] ?? '')
    ));
}

function aiContinue($projectId) {
    $body = getBody();
    $ctx = !empty($body['memories']) ? "\n\nReference memories for context:\n" . $body['memories'] : '';
    sendJSON(aiRequest(
        'You are a warm, skilled memoir ghostwriter. The author has written the following passage and needs you to seamlessly continue the narrative. Match their voice, tone, and style exactly. Continue the story naturally from where they left off. Write 2-3 paragraphs that flow directly from the existing text. Do NOT repeat any of the existing text.',
        ($body['text'] ?? '') . $ctx
    ));
}

function aiSensoryDetails($projectId) {
    $body = getBody();
    sendJSON(aiRequest(
        'You are a sensory detail specialist for memoir writing. Take the following memoir passage and enrich it with vivid sensory details — sights, sounds, smells, textures, and tastes that bring the scene to life. Keep the same events and meaning, but make the reader feel like they are there. Preserve the author\'s voice. Return only the enriched text.',
        $body['text'] ?? ''
    ));
}

function aiDialogue($projectId) {
    $body = getBody();
    sendJSON(aiRequest(
        'You are a skilled memoir dialogue writer. Take the following memoir passage and transform the narrative descriptions of conversations into vivid, natural dialogue scenes. Add dialogue tags, body language, and small actions between lines of speech. Make the characters feel real and distinct. Keep the core events and meaning intact. Return only the rewritten text with dialogue.',
        $body['text'] ?? ''
    ));
}

function aiSuggestTitle($projectId) {
    $body = getBody();
    sendJSON(aiRequest(
        'You are a creative memoir chapter title advisor. Based on the following chapter content, suggest 5 evocative chapter titles that capture the essence of the story. Titles should be short (2-6 words), emotionally resonant, and intriguing. Format as a numbered list. Do not include any other text.',
        $body['text'] ?? ''
    ));
}

function aiSummarize($projectId) {
    $body = getBody();
    sendJSON(aiRequest(
        'You are a memoir editor. Write a concise, compelling summary of the following chapter content in 2-3 sentences. Capture the key events, emotions, and themes. This summary will be used for table of contents and chapter planning. Write in third person.',
        $body['text'] ?? ''
    ));
}

function aiSuggestStructure($projectId) {
    $body = getBody();
    $memories = $body['memories'] ?? [];
    $summary = '';
    foreach ($memories as $i => $m) {
        $num = $i + 1;
        $summary .= "$num. [" . ($m['stage'] ?? '') . "] " . ($m['question'] ?? '') . ": " . substr($m['answer'] ?? '', 0, 150) . "...\n";
    }
    sendJSON(aiRequest(
        'You are a memoir structure advisor. Based on these collected memories, suggest a chapter structure for the memoir. For each chapter, give a title and list which memory numbers should be included. Return valid JSON: an array of objects with "title" (string) and "memoryIndices" (array of 1-based numbers). Return ONLY the JSON array, no other text.',
        $summary
    ));
}

// --- Image Upload ---

function uploadImage($projectId) {
    if (empty($_FILES['image'])) {
        $postMax = ini_get('post_max_size');
        $uploadMax = ini_get('upload_max_filesize');
        sendError("No image received. post_max_size=$postMax, upload_max_filesize=$uploadMax, FILES=" . json_encode(array_keys($_FILES)), 400);
    }

    $file = $_FILES['image'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors = [
            1 => 'File exceeds upload_max_filesize (' . ini_get('upload_max_filesize') . ')',
            2 => 'File exceeds MAX_FILE_SIZE',
            3 => 'File only partially uploaded',
            4 => 'No file was uploaded',
            6 => 'Missing temp folder',
            7 => 'Failed to write to disk',
            8 => 'PHP extension stopped upload',
        ];
        sendError('Upload error: ' . ($errors[$file['error']] ?? "code {$file['error']}"), 400);
    }

    // Validate size (5MB max)
    if ($file['size'] > 5 * 1024 * 1024) sendError('File too large (max 5MB)', 400);

    // Validate type
    $allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $mime = function_exists('mime_content_type') ? mime_content_type($file['tmp_name']) : $file['type'];
    if (!in_array($mime, $allowed)) sendError("Invalid image type: $mime. Allowed: jpg, png, gif, webp", 400);

    // Extension from mime
    $extMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
    $ext = $extMap[$mime] ?? 'jpg';

    // Save to uploads/:projectId/
    $uploadDir = __DIR__ . '/../uploads/' . $projectId;
    ensureDir($uploadDir);
    $filename = uniqid() . '_' . time() . '.' . $ext;
    $dest = $uploadDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) sendError('Failed to save file', 500);

    sendJSON(['url' => 'uploads/' . $projectId . '/' . $filename]);
}

// --- Export ---

function exportJSON($projectId) {
    $dir = projectDir($projectId);
    header('Content-Disposition: attachment; filename="memoir-backup.json"');
    sendJSON([
        'project' => readJSON($dir . '/project.json', []),
        'memories' => readJSON($dir . '/memories.json', []),
        'chapters' => readJSON($dir . '/chapters.json', []),
        'exportedAt' => nowISO(),
    ]);
}

function exportText($projectId) {
    $dir = projectDir($projectId);
    $project = readJSON($dir . '/project.json', []);
    $chapters = readJSON($dir . '/chapters.json', []);
    $title = $project['title'] ?? 'My Memoir';

    $text = $title . "\nby " . ($project['author'] ?? 'Anonymous') . "\n\n";
    foreach ($chapters as $i => $ch) {
        $sep = str_repeat('=', 40);
        $text .= "$sep\nChapter " . ($i + 1) . ": " . ($ch['title'] ?? 'Untitled') . "\n$sep\n\n" . ($ch['content'] ?? '(No content yet)') . "\n\n";
    }

    $filename = preg_replace('/[^a-z0-9]/i', '_', $title) . '.txt';
    header('Content-Type: text/plain; charset=utf-8');
    header("Content-Disposition: attachment; filename=\"$filename\"");
    echo $text;
    exit;
}

function embedImages($html) {
    // Replace <img src="uploads/..."> with base64 data URIs
    return preg_replace_callback('/<img\s([^>]*?)src=["\']((uploads\/[^"\']+))["\']([^>]*?)>/i', function($m) {
        $path = __DIR__ . '/../' . $m[2];
        if (!file_exists($path)) return $m[0]; // leave as-is if file missing
        $mime = mime_content_type($path);
        $data = base64_encode(file_get_contents($path));
        return '<img ' . $m[1] . 'src="data:' . $mime . ';base64,' . $data . '"' . $m[4] . '>';
    }, $html);
}

function exportHTML($projectId) {
    $dir = projectDir($projectId);
    $project = readJSON($dir . '/project.json', []);
    $chapters = readJSON($dir . '/chapters.json', []);
    $title = htmlspecialchars($project['title'] ?? 'My Memoir');
    $author = htmlspecialchars($project['author'] ?? '');

    $toc = '';
    $body = '';
    foreach ($chapters as $i => $ch) {
        $chTitle = htmlspecialchars($ch['title'] ?? 'Chapter ' . ($i + 1));
        $content = $ch['content'] ?? '<p><em>No content yet.</em></p>';
        $content = embedImages($content);
        $toc .= "<li><a href=\"#ch$i\">$chTitle</a></li>";
        $body .= "<div class=\"chapter\" id=\"ch$i\"><h2>$chTitle</h2><div>$content</div></div>";
    }

    $authorLine = $author ? "<p class=\"author\">by $author</p>" : '';
    $tocSection = count($chapters) > 1 ? "<div class=\"toc\"><h3>Table of Contents</h3><ul>$toc</ul></div>" : '';

    $html = <<<HTML
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>$title</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
body{font-family:'Lora',serif;max-width:700px;margin:0 auto;padding:40px 20px;color:#2C2C2C;background:#FAF8F5;line-height:1.8}
h1{text-align:center;font-size:2.4em;margin-bottom:0.2em}
.author{text-align:center;font-size:1.2em;color:#666;margin-bottom:2em}
h2{font-size:1.6em;margin-top:2em;padding-top:1em;border-top:1px solid #ddd}
.toc{margin:2em 0;padding:1.5em;background:#f5f0eb;border-radius:8px}
.toc h3{margin-top:0}.toc ul{list-style:none;padding-left:0}
.toc li{margin:0.5em 0}.toc a{color:#2D6A4F;text-decoration:none}
.chapter{margin-bottom:3em}
blockquote{border-left:3px solid #2D6A4F;margin-left:0;padding-left:1em;color:#555;font-style:italic}
img{max-width:100%;height:auto;border-radius:6px;margin:0.8em 0;display:block}
@media print{body{padding:0;background:white}.toc{page-break-after:always}}
</style></head><body>
<h1>$title</h1>
$authorLine
$tocSection
$body
</body></html>
HTML;

    $filename = preg_replace('/[^a-z0-9]/i', '_', $project['title'] ?? 'memoir') . '.html';
    header('Content-Type: text/html; charset=utf-8');
    header("Content-Disposition: attachment; filename=\"$filename\"");
    echo $html;
    exit;
}

// ============================================================
// ROUTER
// ============================================================

$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$apiBase = dirname($_SERVER['SCRIPT_NAME']); // e.g. /abbu-book/api
$path = substr($requestUri, strlen($apiBase));
if (!$path) $path = '/';

$seg = array_values(array_filter(explode('/', $path)));
$n = count($seg);

// Run migration on first request
migrateIfNeeded();

// Match routes
if ($n >= 1 && $seg[0] === 'projects') {

    // /projects
    if ($n === 1) {
        if ($method === 'GET')  listProjects();
        if ($method === 'POST') createProject();
        sendError('Method not allowed', 405);
    }

    $projectId = $seg[1];
    if (!validateId($projectId)) sendError('Invalid project ID', 400);

    // /projects/:id
    if ($n === 2) {
        if ($method === 'GET')    getProject($projectId);
        if ($method === 'PUT')    updateProject($projectId);
        if ($method === 'DELETE') deleteProject($projectId);
        sendError('Method not allowed', 405);
    }

    $resource = $seg[2];

    // /projects/:id/memories
    if ($resource === 'memories') {
        if ($n === 3) {
            if ($method === 'GET')  getMemories($projectId);
            if ($method === 'POST') createMemory($projectId);
        }
        if ($n === 4) {
            $memId = $seg[3];
            if ($method === 'PUT')    updateMemory($projectId, $memId);
            if ($method === 'DELETE') deleteMemory($projectId, $memId);
        }
    }

    // /projects/:id/chapters
    if ($resource === 'chapters') {
        if ($n === 3) {
            if ($method === 'GET')  getChapters($projectId);
            if ($method === 'POST') createChapter($projectId);
        }
        if ($n === 4) {
            if ($seg[3] === 'reorder' && $method === 'PUT') reorderChapters($projectId);
            $chId = $seg[3];
            if ($method === 'PUT')    updateChapter($projectId, $chId);
            if ($method === 'DELETE') deleteChapter($projectId, $chId);
        }
    }

    // /projects/:id/upload
    if ($resource === 'upload' && $n === 3 && $method === 'POST') {
        uploadImage($projectId);
    }

    // /projects/:id/ai/*
    if ($resource === 'ai' && $n === 4 && $method === 'POST') {
        if ($seg[3] === 'expand')            aiExpand($projectId);
        if ($seg[3] === 'draft-opening')     aiDraftOpening($projectId);
        if ($seg[3] === 'polish')            aiPolish($projectId);
        if ($seg[3] === 'follow-up')         aiFollowUp($projectId);
        if ($seg[3] === 'suggest-structure') aiSuggestStructure($projectId);
        if ($seg[3] === 'continue')          aiContinue($projectId);
        if ($seg[3] === 'sensory-details')   aiSensoryDetails($projectId);
        if ($seg[3] === 'dialogue')          aiDialogue($projectId);
        if ($seg[3] === 'suggest-title')     aiSuggestTitle($projectId);
        if ($seg[3] === 'summarize')         aiSummarize($projectId);
    }

    // /projects/:id/export/*
    if ($resource === 'export' && $n === 4 && $method === 'GET') {
        if ($seg[3] === 'json') exportJSON($projectId);
        if ($seg[3] === 'text') exportText($projectId);
        if ($seg[3] === 'html') exportHTML($projectId);
    }
}

sendError('Not found', 404);
