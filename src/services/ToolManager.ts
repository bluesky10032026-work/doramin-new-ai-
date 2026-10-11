import { BrowserActionItem } from '../types/assistant';

export interface ToolExecutionResult {
  status: 'success' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

type ActionCallback = (action: BrowserActionItem) => void;

export class ToolManager {
  private actionListeners: Set<ActionCallback> = new Set();
  private onThemeChange?: (theme: 'cyberpunk' | 'matrix' | 'nebula' | 'solar') => void;

  public onAction(callback: ActionCallback): () => void {
    this.actionListeners.add(callback);
    return () => this.actionListeners.delete(callback);
  }

  public registerThemeHandler(handler: (theme: 'cyberpunk' | 'matrix' | 'nebula' | 'solar') => void) {
    this.onThemeChange = handler;
  }

  private notifyAction(action: BrowserActionItem) {
    this.actionListeners.forEach((listener) => {
      try {
        listener(action);
      } catch (err) {
        console.error('Error in tool action listener:', err);
      }
    });
  }

  /**
   * Validates URLs according to strict browser safety guidelines.
   * Only http and https protocols are permitted.
   */
  public sanitizeUrl(rawUrl: string): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let trimmed = rawUrl.trim();

    // Auto-prepend https:// if protocol is omitted
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }

    try {
      const parsed = new URL(trimmed);
      // Strictly verify safe web protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      // Prohibit dangerous schemes or script injection in hostname
      if (!parsed.hostname || parsed.hostname.includes('javascript:')) {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  /**
   * Executes a tool request dispatched by Gemini Live
   */
  public async executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    switch (name) {
      case 'openWebsite': {
        const rawUrl = String(args.url || '');
        const title = String(args.title || rawUrl);
        const validUrl = this.sanitizeUrl(rawUrl);

        if (!validUrl) {
          const actionItem: BrowserActionItem = {
            id: actionId,
            toolName: 'openWebsite',
            title: `Blocked invalid URL: ${rawUrl}`,
            target: rawUrl,
            timestamp: Date.now(),
            status: 'blocked',
            details: 'URL scheme or format rejected for safety reasons.',
          };
          this.notifyAction(actionItem);
          return {
            status: 'error',
            message: `Could not open '${rawUrl}'. Only secure http/https web URLs are permitted.`,
          };
        }

        // Attempt to open safely
        let opened = false;
        try {
          const newWindow = window.open(validUrl, '_blank', 'noopener,noreferrer');
          opened = Boolean(newWindow && !newWindow.closed);
        } catch {
          opened = false;
        }

        const actionItem: BrowserActionItem = {
          id: actionId,
          toolName: 'openWebsite',
          title: title ? `Open: ${title}` : `Open: ${new URL(validUrl).hostname}`,
          target: validUrl,
          timestamp: Date.now(),
          status: opened ? 'success' : 'pending',
          details: opened
            ? 'Window opened successfully'
            : 'Popup may be blocked by browser. User can tap the HUD card to view.',
        };
        this.notifyAction(actionItem);

        return {
          status: 'success',
          message: opened
            ? `Successfully opened ${validUrl} in a new tab.`
            : `Requested to open ${validUrl}. Browser blocked popup or opened in background.`,
          data: { url: validUrl, opened },
        };
      }

      case 'searchWeb': {
        const query = String(args.query || '').trim();
        if (!query) {
          return {
            status: 'error',
            message: 'Search query cannot be empty.',
          };
        }

        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        let opened = false;
        try {
          const newWindow = window.open(searchUrl, '_blank', 'noopener,noreferrer');
          opened = Boolean(newWindow && !newWindow.closed);
        } catch {
          opened = false;
        }

        const actionItem: BrowserActionItem = {
          id: actionId,
          toolName: 'searchWeb',
          title: `Search: "${query}"`,
          target: searchUrl,
          timestamp: Date.now(),
          status: 'success',
          details: `Searched for "${query}" on Google.`,
        };
        this.notifyAction(actionItem);

        return {
          status: 'success',
          message: `Opened web search for "${query}".`,
          data: { query, searchUrl, opened },
        };
      }

      case 'changeThemeMood': {
        const mood = String(args.mood || '').toLowerCase() as
          | 'cyberpunk'
          | 'matrix'
          | 'nebula'
          | 'solar';

        const validMoods = ['cyberpunk', 'matrix', 'nebula', 'solar'];
        const selectedMood = validMoods.includes(mood) ? mood : 'cyberpunk';

        if (this.onThemeChange) {
          this.onThemeChange(selectedMood);
        }

        const actionItem: BrowserActionItem = {
          id: actionId,
          toolName: 'changeThemeMood',
          title: `Theme Shift: ${selectedMood.toUpperCase()}`,
          timestamp: Date.now(),
          status: 'success',
          details: `Switched visual ambience to ${selectedMood}.`,
        };
        this.notifyAction(actionItem);

        return {
          status: 'success',
          message: `Visual theme updated to ${selectedMood}.`,
          data: { mood: selectedMood },
        };
      }

      case 'setTimer': {
        const minutes = Math.max(0.1, Number(args.minutes) || 1);
        const label = String(args.label || `${minutes} min timer`);

        const actionItem: BrowserActionItem = {
          id: actionId,
          toolName: 'setTimer',
          title: `Timer: ${minutes} min (${label})`,
          timestamp: Date.now(),
          status: 'success',
          details: `Countdown started for ${minutes} minute(s).`,
        };
        this.notifyAction(actionItem);

        // Schedule timer notification in browser
        setTimeout(() => {
          try {
            const audio = new Audio(
              'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhW2ZpdZaeqp1sYmFsaoiMjo6Pj46PjpCSlZeboqOip6mrra+xsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+'
            );
            audio.play().catch(() => {});
          } catch {
            // ignore
          }
        }, minutes * 60 * 1000);

        return {
          status: 'success',
          message: `Timer set for ${minutes} minute(s) labeled "${label}".`,
          data: { minutes, label },
        };
      }

      case 'getCurrentTime': {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

        return {
          status: 'success',
          message: `Current local time is ${timeString} (${dateString}).`,
          data: { timeString, dateString, timestamp: Date.now() },
        };
      }

      default: {
        return {
          status: 'error',
          message: `Unknown tool name: ${name}`,
        };
      }
    }
  }
}
