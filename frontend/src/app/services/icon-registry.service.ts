import { Injectable, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class IconRegistryService {
  private readonly iconRegistry = inject(MatIconRegistry);
  private readonly sanitizer = inject(DomSanitizer);

  register(): void {
    this.iconRegistry.addSvgIconSet(
      this.sanitizer.bypassSecurityTrustResourceUrl('icons/material-icons.svg')
    );
  }
}


