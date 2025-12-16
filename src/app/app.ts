import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
// FIX: Changed path to match your actual file location
import { GeminiAiService } from './services/gemini-ai';

interface Todo {
  id: number;
  text: string;
  done: boolean;
  duration?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // FIX: Inject the service securely
  private aiService = inject(GeminiAiService);

  protected readonly storageKey = 'minimal-todos';
  protected draftText = '';
  protected todos = signal<Todo[]>([]);

  constructor() {
    effect(() => {
      localStorage.setItem(this.storageKey, JSON.stringify(this.todos()));
    });
  }

  public ngOnInit(): void {
    this.loadTodosFromStorage();
  }

  // Consolidated Add Method
  async addTodo() {
    const text = this.draftText.trim();
    if (!text) return;

    // 1. Create todo with loading state
    const newTodo: Todo = {
      id: Date.now(),
      text,
      done: false,
      duration: '...'
    };

    // 2. Update signal
    this.todos.update((current) => [...current, newTodo]);
    this.draftText = '';

    // 3. Call AI
    const timeEstimate = await this.aiService.estimateDuration(text);

    // 4. Update the duration when AI finishes
    this.todos.update((current) =>
      current.map(t => t.id === newTodo.id ? { ...t, duration: timeEstimate } : t)
    );
  }

  protected toggleTodo(id: number): void {
    this.todos.update((current) =>
      current.map((todo) => todo.id === id ? { ...todo, done: !todo.done } : todo)
    );
  }

  protected removeTodo(id: number): void {
    this.todos.update((current) => current.filter((todo) => todo.id !== id));
  }

  private loadTodosFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) this.todos.set(parsed);
    } catch {
      this.todos.set([]);
    }
  }
}
