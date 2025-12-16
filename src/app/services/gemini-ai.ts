import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GeminiAiService {

  async estimateDuration(taskText: string): Promise<string> {
    // 1. Construct a simple URL-based prompt
    const prompt = `Estimate time for task "${taskText}". Reply ONLY with the duration (e.g. 15m, 1h). No other text.`;

    // Pollinations uses a simple GET request, which passes through most firewalls
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;

    try {
      const response = await fetch(url);
      const text = await response.text();

      // Basic cleanup in case it returns extra spaces
      return text.trim() || '30m';
    } catch (error) {
      console.error('Pollinations Error:', error);
      // Fallback if even this gets blocked
      return '1h';
    }
  }
}
