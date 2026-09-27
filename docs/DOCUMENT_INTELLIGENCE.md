# Document intelligence

Nikky's document pipeline separates file intake, extraction, analysis, and external actions.

## Local support

The current core can directly parse plain text, Markdown, CSV, JSON, EML, logs, INI/config-style files, and similar text artifacts. Secret-looking config keys are redacted during config parsing.

## Binary documents

PDF, DOCX, XLSX, PPTX and images are accepted as document/image types but require a configured extractor/vision provider before their contents are claimed as understood. The core explicitly returns `requiresExtractor: true` when no such extractor is configured.

## Cross-app workflow

Selected file → extraction → analysis/summary → recipient resolution → structured `email.send` proposal → Authority Engine → Approval/Executor.

No external email is sent directly by the document analyzer.
