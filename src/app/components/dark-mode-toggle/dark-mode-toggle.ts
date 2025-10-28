import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';

@Component({
  standalone: true,
  selector: 'dark-mode-toggle',
  imports: [CommonModule],
  templateUrl: './dark-mode-toggle.html',
  styleUrl: './dark-mode-toggle.css',
  encapsulation: ViewEncapsulation.None,
})
export class DarkModeToggleComponent implements OnInit {
  isDarkMode = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Aguardar o DOM estar completamente carregado
      setTimeout(() => {
        // Carregar preferência do localStorage
        const savedTheme = localStorage.getItem('theme');
        this.isDarkMode = savedTheme === 'dark';
        console.log(
          '🌙 [TOGGLE COMPONENT] Inicializado - Tema:',
          savedTheme,
          'isDarkMode:',
          this.isDarkMode
        );
        this.applyTheme();
        this.cdr.detectChanges();
      }, 0);
    }
  }

  toggleDarkMode(): void {
    console.log('🌙 [TOGGLE COMPONENT] Clique detectado!');
    if (isPlatformBrowser(this.platformId)) {
      this.isDarkMode = !this.isDarkMode;
      console.log('🌙 [TOGGLE COMPONENT] Novo estado:', this.isDarkMode ? 'DARK' : 'LIGHT');
      this.applyTheme();
      this.cdr.detectChanges();
    }
  }

  private applyTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      const htmlElement = this.document.documentElement;
      const bodyElement = this.document.body;

      if (this.isDarkMode) {
        this.renderer.addClass(htmlElement, 'dark-mode');
        this.renderer.addClass(bodyElement, 'dark-mode');
        localStorage.setItem('theme', 'dark');
        console.log('🌙 [TOGGLE COMPONENT] ✅ Classe "dark-mode" ADICIONADA ao HTML e BODY');
      } else {
        this.renderer.removeClass(htmlElement, 'dark-mode');
        this.renderer.removeClass(bodyElement, 'dark-mode');
        localStorage.setItem('theme', 'light');
        console.log('🌙 [TOGGLE COMPONENT] ❌ Classe "dark-mode" REMOVIDA do HTML e BODY');
      }
    }
  }
}
