import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';


interface Todo {
  id: number;
  text: string;
  done: boolean;
  durationMinutes?: number | null;
  urgencyBadge?: 'LOW' | 'MEDIUM' | 'HIGH';
  analyzing?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private http = inject(HttpClient);

  constructor() {
    // Set up an effect to auto-persist todos whenever they change.
    effect(() => {
      localStorage.setItem(this.storageKey, JSON.stringify(this.todos()));
    });
  }
  // Key used to persist todos in localStorage so reads/writes stay consistent.
  protected readonly storageKey = 'minimal-todos';

  // Two-way bound input value for the text field.
  protected draftText = '';

  // Signal holding the array of todo items for reactive updates.
  protected todos = signal<Todo[]>([]);

  // Load any persisted todos as soon as the component initializes, then set up auto-save.
  public ngOnInit(): void {
    this.loadTodosFromStorage();
  }

  // Add a new todo using the current draft text, then reset the input.
  protected addTodo(): void {
    const text = this.draftText.trim();
    if (!text) {
      return; // Ignore empty submissions to keep the list clean.
    }

    // Simple id using timestamp to avoid collisions in this demo.
    const nextTodo: Todo = { id: Date.now(), text, done: false, analyzing: true };
    this.todos.update((current) => [...current, nextTodo]);
    this.draftText = '';
    
    // Analyze task urgency using AI
    this.analyzeTaskUrgency(nextTodo.id, text);
  }

  // Analyze task using Pollinations AI
  private async analyzeTaskUrgency(todoId: number, taskText: string): Promise<void> {
    try {
      const result = await this.fetchTaskAnalysisFromPollinations(taskText);
      
      this.todos.update((current) =>
        current.map((todo) => {
          if (todo.id === todoId) {
            return {
              ...todo,
              durationMinutes: result.durationMinutes,
              urgencyBadge: result.badge,
              analyzing: false
            };
          }
          return todo;
        })
      );
    } catch (error) {
      console.error('Fout bij AI-analyse:', error);
      // Set default values on error
      this.todos.update((current) =>
        current.map((todo) => {
          if (todo.id === todoId) {
            return { ...todo, urgencyBadge: 'LOW', analyzing: false };
          }
          return todo;
        })
      );
    }
  }

  // Build Pollinations URL
  private buildPollinationsUrl(prompt: string): string {
    const encoded = encodeURIComponent(prompt);
    return `https://text.pollinations.ai/${encoded}`;
  }

  // Parse duration from AI response
  private parseDurationMinutes(text: string): number | null {
    const hMatch = text.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/i);
    const mMatch = text.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:uten|utes)?)?/i);

    let minutes = 0;
    if (hMatch) minutes += Math.round(parseFloat(hMatch[1]) * 60);
    if (mMatch) minutes += Math.round(parseFloat(mMatch[1]));

    // Extra vorm: "duur: 45 minuten" zonder 'm'
    if (!mMatch && !hMatch) {
      const altMin = text.match(/(\d+)\s*(?:minuten|minutes|min)\b/i);
      if (altMin) minutes = Math.round(parseFloat(altMin[1]));
    }

    // Als niets gevonden, probeer een losse "X hours" of "X minuten"
    if (minutes === 0) {
      const hoursOnly = text.match(/(?:duur|duration|time|takes)[:\s]*?(\d+(?:\.\d+)?)\s*hours?/i);
      if (hoursOnly) minutes = Math.round(parseFloat(hoursOnly[1]) * 60);
    }

    return minutes > 0 ? minutes : null;
  }

  // Compute urgency badge based on duration
  private computeBadge(durationMinutes: number | null): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (durationMinutes != null) {
      if (durationMinutes > 120) return 'HIGH';
      if (durationMinutes > 60) return 'MEDIUM';
      return 'LOW';
    }
    return 'LOW';
  }

  // Fetch task analysis from Pollinations AI
  private async fetchTaskAnalysisFromPollinations(taskText: string): Promise<{
    rawText: string;
    durationMinutes: number | null;
    badge: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const prompt = `
      Analyseer deze taak: "${taskText}".
      Schat de benodigde tijd in uren en minuten (bijv. "duur: 1h 30m" of "45 min").
      Antwoord kort in platte tekst.
    `;

    const url = this.buildPollinationsUrl(prompt);

    const rawText = await this.http.get(url, {
      responseType: 'text',
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'TaskUrgencyClient/1.0'
      }
    }).toPromise() as string;

    const durationMinutes = this.parseDurationMinutes(rawText);
    const badge = this.computeBadge(durationMinutes);

    return { rawText, durationMinutes, badge };
  }

  // Toggle completion state for a single todo item.
  protected toggleTodo(id: number): void {
    this.todos.update((current) =>
      current.map((todo) => {
      if (todo.id === id) {
        return { ...todo, done: !todo.done };
      }
      return todo;
      })
    );
  }

  // Remove one todo by id so the list stays tidy.
  protected removeTodo(id: number): void {
    this.todos.update((current) => current.filter((todo) => todo.id !== id));
  }

  // Retrieve persisted todos from localStorage, safely handling bad data.
  private loadTodosFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.todos.set(parsed);
      }
    } catch {
      // Ignore malformed storage; start fresh without crashing.
      this.todos.set([]);
    }
  }


}
