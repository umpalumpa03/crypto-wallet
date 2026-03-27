import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeStore } from '../../core/store/trade.store';
import { MarketStore } from '../../core/store/market.store';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-ledger',

  imports: [CommonModule],
  templateUrl: './ledger.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ledger {
  public tradeAPI = inject(TradeStore);
  public market = inject(MarketStore);
  public isExportMenuOpen = signal(false);
  public isAssetFilterOpen = signal(false);
  private elementRef = inject(ElementRef);

  constructor() {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (
      this.isExportMenuOpen() &&
      !this.elementRef.nativeElement.querySelector('.export-dropdown')?.contains(target)
    ) {
      this.isExportMenuOpen.set(false);
    }

    if (
      this.isAssetFilterOpen() &&
      !this.elementRef.nativeElement.querySelector('.asset-filter-container')?.contains(target)
    ) {
      this.isAssetFilterOpen.set(false);
    }
  }

  public toggleExportMenu(event: Event): void {
    event.stopPropagation();
    this.isExportMenuOpen.set(!this.isExportMenuOpen());
    this.isAssetFilterOpen.set(false);
  }

  public toggleAssetFilter(event: Event): void {
    event.stopPropagation();
    this.isAssetFilterOpen.set(!this.isAssetFilterOpen());
    this.isExportMenuOpen.set(false);
  }

  public onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.tradeAPI.setSearchQuery(query);
  }

  public onFilterAsset(asset: string): void {
    this.tradeAPI.setAssetFilter(asset);
    this.isAssetFilterOpen.set(false);
  }

  private getExportData() {
    const data = this.tradeAPI.filteredHistory();
    const headers = [
      'Timestamp',
      'Transaction ID',
      'Type',
      'Asset',
      'Amount',
      'Price (USD)',
      'Total Value (USD)',
    ];
    const rows = data.map((tx) => [
      new Date(tx.createdAt).toLocaleString(),
      `TXN-${tx.id.split('-')[0].toUpperCase()}`,
      tx.type,
      tx.assetSymbol,
      tx.amount.toString(),
      tx.priceAtTime.toString(),
      (tx.amount * tx.priceAtTime).toFixed(2),
    ]);
    return { headers, rows };
  }

  public exportCSV(): void {
    const { headers, rows } = this.getExportData();
    if (!rows.length) return;

    const csvContent = Papa.unparse({
      fields: headers,
      data: rows,
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `aurora_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.isExportMenuOpen.set(false);
  }

  public exportPDF(): void {
    const { headers, rows } = this.getExportData();
    if (!rows.length) return;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Aurora Ledger History', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [0, 56, 40], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`aurora_ledger_${new Date().toISOString().split('T')[0]}.pdf`);
    this.isExportMenuOpen.set(false);
  }

  public accountEquity = computed(() => {
    const portfolio = this.tradeAPI.cryptoPortfolio();
    const btcValue = (portfolio['BTC'] || 0) * this.market.liveBtcPrice();
    const ethValue = (portfolio['ETH'] || 0) * this.market.liveEthPrice();
    const solValue = (portfolio['SOL'] || 0) * this.market.liveSolPrice();
    return this.tradeAPI.usdBalance() + btcValue + ethValue + solValue;
  });

  public totalVolume = computed(() => {
    const history = this.tradeAPI.tradeHistory();
    return history.reduce((sum, tx) => sum + tx.amount * tx.priceAtTime, 0);
  });
}
