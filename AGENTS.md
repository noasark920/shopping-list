## Product-specific rules
- The default and primary screen is the shopping list.
- Product management and category management are secondary screens.
- The app is designed mainly for personal use on a smartphone.
- Reduce first-view height usage as much as possible.
- Avoid persistent navigation elements that consume space on mobile.
- Remaining-item count is more important in shopping mode than in selection mode.
- Category sort order and product sort order are separate concepts and must not be mixed.
- Bulk actions must favor safety and clarity over density.

## Project overview
This project is a personal shopping list web app for smartphone use during shopping.
The main goal is fast operation, clear visibility, and low cognitive load on mobile screens.
Do not prioritize flashy UI over usability.

## Source of truth
Before making changes, always check these files if they exist:
1. `Specs/要件定義.md`
2. `Specs/画面仕様.md`
3. `Specs/機能仕様.md`
4. `Specs/変更履歴.md`

If implementation and spec differ, follow the spec unless the user explicitly instructs otherwise.

## Project structure
- `src/` : application source files
- `Specs/` : requirements and design documents
- `Prompts/` : reusable task prompts
- `data/` : seed or import data if present

## Working rules
- Read relevant spec files before editing code.
- Preserve existing working features unless the task explicitly requires changing them.
- Do not perform broad refactors unless necessary for the requested task.
- Prefer minimal, local changes.
- Optimize for smartphone layout first.
- Keep Japanese UI text in Japanese.
- Do not change naming conventions, storage format, or data structure without reason.
- Do not remove existing features unless explicitly instructed.
- When changing UI, avoid increasing vertical space unnecessarily.
- When adding features, consider compatibility with current local data and current user flow.

## UI principles
- Mobile-first layout
- Minimize vertical space usage
- Prioritize readability and tap ease
- Keep the main shopping workflow fast
- Avoid clutter and always-visible explanatory text when a tooltip or compact help is enough

## Code style
- Use clear and descriptive names.
- Keep functions focused on one responsibility.
- Avoid unnecessary comments.
- Reuse existing patterns before introducing new ones.
- Keep HTML, CSS, and JS changes consistent with the current structure.

## Validation
After changes, verify:
- No obvious syntax errors
- Main shopping list flow still works
- Product management still works
- Category management still works
- Mobile layout does not visibly break
- New behavior matches the requested specification

## Definition of done
A task is done only if:
1. The requested change is implemented.
2. Existing core behavior is preserved.
3. The affected screens are checked for mobile usability.
4. A short summary of changed files, behavior, and remaining risks is provided.

## Response format
When reporting back:
1. State what was changed.
2. List edited files.
3. Mention any assumptions made.
4. Mention risks or unverified points.

## Project structure
- src/: application files
- Specs/: requirements
- Prompts/: reusable prompts