# Project Instructions

## Package Manager
- Use pnpm for all package management commands

## Styling
- For all files in `site/` workspace, use Tailwind CSS for styling
- Use Tailwind utility classes directly in className attributes
- Avoid inline styles or CSS modules in the site workspace

## Images
- For all files in `site/` workspace, use Next.js `Image` component from `next/image`
- Never use HTML `<img>` tags in the site workspace
- Always provide `width` and `height` props to Image components
