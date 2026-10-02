import { CodeXml, Video } from "lucide-react";

import pkg from "../../package.json";

const GITHUB_URL = "https://github.com/PrepTrac";
const YOUTUBE_URL = "https://www.youtube.com/@hardenedsite";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-raised mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-ink dark:hover:text-ink transition-colors"
            aria-label="PrepTrac on GitHub"
          >
            <CodeXml className="h-5 w-5" aria-hidden />
            <span>GitHub</span>
          </a>
          <span className="text-muted" aria-hidden>
            •
          </span>
          <span className="font-medium text-ink">
            PrepTrac © v{pkg.version}
          </span>
          <span className="text-muted" aria-hidden>
            •
          </span>
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-ink dark:hover:text-ink transition-colors"
            aria-label="HardenedSite on YouTube"
          >
            <Video className="h-5 w-5" aria-hidden />
            <span>YouTube</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
