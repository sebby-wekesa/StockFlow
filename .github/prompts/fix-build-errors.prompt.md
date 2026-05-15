---
description: "Diagnose and fix StockFlow build errors (TypeScript, Prisma, Next.js). Use when the build fails — provide the error output to get systematic fixes."
name: "Fix Build Errors"
argument-hint: "Paste build error output or describe the issue"
agent: "agent"
tools: [read-files, list-files, grep]
---

# Fix Build Errors for StockFlow

You are debugging build errors in a Next.js + Prisma + TypeScript project. Your goal is to:
1. **Identify** the root cause from the error message
2. **Locate** the problematic files and code
3. **Suggest** targeted fixes with explanations
4. **Verify** the fix won't break other parts

## Error Categories & Approach

### TypeScript Type Errors
- Check type definitions match actual values
- Verify imports are correct and not circular
- Look for missing type annotations or casting issues
- Check Prisma types are up-to-date (`prisma generate`)

### Prisma Schema/Migration Errors
- Verify schema syntax and field types
- Check relations are correctly defined
- Look for unique/foreign key conflicts
- Ensure migrations match current schema

### Next.js Build/Compilation Errors
- Check middleware, API routes, page layouts are valid
- Verify server/client component boundaries (`"use server"`, `"use client"`)
- Look for missing async/await usage
- Check imports and dependencies are available

### Runtime Import/Module Errors
- Verify file paths and aliases (@/ usage)
- Check for circular dependencies
- Ensure `.env` variables are set
- Verify Prisma client is properly initialized

## Investigation Steps

1. **Parse the error message** — what file, what line, what's the error?
2. **Read the problematic file** — understand the context around the error
3. **Check related files** — imports, schema, config files as needed
4. **Look for patterns** — are there similar issues elsewhere?
5. **Provide fix** — show exact code changes with before/after

## Output Format

When suggesting fixes:
- Show the full function or code block that needs changing
- Explain what was wrong and why
- Provide the corrected version
- Mention any other files that might be affected

---

**Note**: If the build is currently passing with no errors, nothing needs fixing right now! 

To use: Run `npm run build` to generate error output, then paste it here along with this prompt.
