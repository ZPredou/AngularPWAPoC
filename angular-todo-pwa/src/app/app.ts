import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TodoListComponent } from './features/todo';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TodoListComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Angular Todo PWA');
}
