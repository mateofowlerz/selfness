export const shell = `
<a class="skip-link sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-10 focus:p-3 focus:bg-fg focus:text-bg" href="#brief">Skip to meeting brief</a>
<div class="shell max-w-[1088px] mx-auto px-4 sm:px-8">
  <header class="masthead pt-8 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
    <div class="min-w-0">
      <a href="/" class="block font-semibold text-base leading-tight no-underline">Mateo Fowler</a>
      <p class="text-base text-muted leading-tight">Making AI great for creatives at <a href="https://www.krea.ai" target="_blank" rel="noopener noreferrer" class="hover:text-primary-dark transition-colors">Krea</a></p>
      <nav aria-label="Breadcrumb" class="pt-4 text-sm text-muted">
        <ol class="flex items-center gap-1"><li><a href="/" class="hover:text-fg transition-colors">Home</a></li><li><span aria-hidden="true">/</span> <a href="#" class="brand text-fg" aria-label="EAG NYC meeting notes home" aria-current="page">EAG NYC</a></li></ol>
      </nav>
    </div>
    <div class="masthead-right flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      <span class="private-label basis-full text-xs text-muted sm:text-right" id="sync-status">Private · synced notes</span>
      <button class="button min-h-11 hover:text-primary-dark transition-colors" id="import-notes">Import local notes</button>
      <button class="button min-h-11 hover:text-primary-dark transition-colors" id="lock-guide">Lock</button>
      <button id="next-up" class="button next-up min-h-11 flex items-center gap-2 text-primary-dark hover:text-primary-darker transition-colors">Next meeting <span aria-hidden="true">→</span></button>
    </div>
  </header>
  <button id="import-file" class="min-h-11 text-sm text-primary-dark underline underline-offset-4" hidden>Import a downloaded notes file instead</button>
  <div class="intro flex flex-wrap justify-between items-end gap-4 pt-12 md:pt-16 pb-8">
    <div><h1 class="text-[32px] font-medium leading-tight tracking-[-0.02em] mb-2">Meeting notes</h1><p class="text-sm text-muted">EAG NYC · October 16–18, 2026</p></div>
    <p class="intro-meta text-sm text-muted leading-6 sm:text-right"><span id="total">29 confirmed</span><br>All times in New York · EDT</p>
  </div>
  <div class="workspace grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] gap-10 lg:gap-14 items-start">
    <aside class="agenda md:sticky md:top-8 min-w-0" aria-label="Meeting schedule">
      <div class="agenda-tools">
        <label class="search-label block text-sm font-semibold mb-2" for="search">Find a person or topic</label>
        <div class="search-wrap flex items-center gap-2 px-3 border border-fg/15 bg-white/50 rounded [&_input]:w-full [&_input]:min-w-0 [&_input]:h-11 [&_input]:text-base [&_input]:bg-transparent [&_input]:outline-offset-0 [&_svg]:shrink-0 text-muted"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="search" class="text-fg placeholder:text-muted" type="search" placeholder="Name, organization, topic…" autocomplete="off"></div>
        <div class="day-tabs flex gap-2 mt-3 border-b border-fg/10 [&_button]:flex-1 [&_button]:min-h-11 [&_button]:text-sm [&_button]:border-b-2 [&_button]:border-transparent [&_button]:text-muted [&_button[aria-pressed=true]]:border-primary [&_button[aria-pressed=true]]:text-primary-dark" role="group" aria-label="Filter meetings by day"><button data-day="all" aria-pressed="true">All</button><button data-day="2026-10-16" aria-pressed="false">Fri 16</button><button data-day="2026-10-17" aria-pressed="false">Sat 17</button><button data-day="2026-10-18" aria-pressed="false">Sun 18</button></div>
      </div>
      <div class="agenda-caption flex justify-between text-xs text-muted pt-5 pb-2"><span id="results-count" aria-live="polite">29 meetings</span><span>Confirmed</span></div>
      <nav id="meeting-list" class="meeting-list max-h-[260px] md:max-h-[calc(100dvh-310px)] overflow-y-auto overscroll-contain pr-1" aria-label="Select a meeting"></nav>
      <p class="snapshot hidden md:block text-xs text-muted leading-6 pt-4 mt-5 border-t border-fg/10">Schedule checked Oct 16, 1:22 PM EDT.<br><a class="inline-flex items-center min-h-11 text-primary-dark hover:text-primary-darker transition-colors" href="https://app.swapcard.com/event/ea-global-new-york-city-2026/my-schedule?view=schedule" target="_blank" rel="noopener noreferrer">Live Swapcard schedule ↗</a></p>
    </aside>
    <main id="brief" class="brief min-w-0 scroll-mt-6 pb-8" tabindex="-1" aria-label="Selected meeting brief"></main>
  </div>
  <footer class="page-footer py-8 mt-4 text-xs text-muted border-t border-fg/10">Research checked October 16, 2026 · Suggested questions are editorial.</footer>
</div>
`;
