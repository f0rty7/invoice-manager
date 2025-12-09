import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { InvoiceStateService } from '../../services/invoice-state.service';
import { UploadComponent } from '../../components/upload/upload.component';
import { FilterBarComponent } from '../../components/filter-bar/filter-bar.component';
import { StatsCardsComponent } from '../../components/stats-cards/stats-cards.component';
import { InvoiceTableComponent } from '../../components/invoice-table/invoice-table.component';
import { ChartsComponent } from '../../components/charts/charts.component';
import { AdvancedChartsComponent } from '../../components/advanced-charts/advanced-charts.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    FilterBarComponent,
    StatsCardsComponent,
    InvoiceTableComponent,
    ChartsComponent,
    AdvancedChartsComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private invoiceState = inject(InvoiceStateService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  currentUser = this.authService.currentUser;
  isAdmin = this.authService.isAdmin;

  openUploadDialog(): void {
    const dialogRef = this.dialog.open(UploadComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false
    });

    dialogRef.componentInstance.uploadComplete.subscribe(() => {
      this.onUploadComplete();
    });
  }

  onUploadComplete(): void {
    // Refresh invoice list and stats after upload
    this.invoiceState.refreshInvoices();
    this.invoiceState.loadStats();
  }

  logout(): void {
    this.authService.logout();
  }

  goToAdmin(): void {
    this.router.navigate(['/admin']);
  }
}

