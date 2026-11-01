import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 80, 
    paddingBottom: 100,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  titleSection: {
    marginBottom: 20,
    marginTop: 10,
  },
  fixedHeader: {
    position: 'absolute',
    top: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  redSubtitle: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  mainHeadline: {
    fontSize: 28,
    color: '#111827',
    fontWeight: 'bold',
    marginBottom: 10,
    lineHeight: 1.2,
  },
  highlightText: {
    color: '#3B82F6',
  },
  redHighlightText: {
    color: '#EF4444',
  },
  description: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 1.5,
    marginBottom: 30,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  kpiCardActual: {
    width: '30%',
    padding: 15,
    borderRadius: 4,
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
  },
  kpiCardProlt: {
    width: '30%',
    padding: 15,
    borderRadius: 4,
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
  },
  kpiCardSavings: {
    width: '30%',
    padding: 15,
    borderRadius: 4,
    backgroundColor: '#F0F9FF',
    border: '1px solid #BAE6FD',
  },
  kpiLabelActual: { fontSize: 10, color: '#6B7280', marginBottom: 5 },
  kpiLabelProlt: { fontSize: 10, color: '#047857', marginBottom: 5 },
  kpiLabelSavings: { fontSize: 10, color: '#0369A1', marginBottom: 5, fontWeight: 'bold' },
  kpiValueActual: { fontSize: 22, color: '#DC2626', fontWeight: 'bold' },
  kpiValueProlt: { fontSize: 22, color: '#059669', fontWeight: 'bold' },
  kpiValueSavings: { fontSize: 22, color: '#0284C7', fontWeight: 'bold' },
  chartBox: {
    border: '1px solid #E5E7EB',
    borderRadius: 4,
    padding: 15,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 200,
    objectFit: 'contain',
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  col1: { width: '15%', fontSize: 9, color: '#374151' },
  col2: { width: '15%', fontSize: 9, color: '#374151', textAlign: 'right' },
  col3: { width: '15%', fontSize: 9, color: '#374151', textAlign: 'right' },
  col4: { width: '15%', fontSize: 9, color: '#059669', textAlign: 'right' },
  col5: { width: '13%', fontSize: 9, color: '#374151', textAlign: 'right' },
  col6: { width: '14%', fontSize: 9, color: '#374151', textAlign: 'right' },
  col7: { width: '13%', fontSize: 9, color: '#10B981', textAlign: 'right', fontWeight: 'bold' },
  colHeader: { fontSize: 9, fontWeight: 'bold', color: '#6B7280' },
  glossaryBox: {
    border: '1px solid #1E3A8A',
    borderRadius: 4,
    padding: 20,
    marginTop: 20,
    flexDirection: 'row',
  },
  glossaryLeft: {
    width: '70%',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  glossaryRight: {
    width: '30%',
    paddingLeft: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glossaryTerm: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  glossaryDesc: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 1.4,
    marginBottom: 10,
  },
  nextStepText: {
    fontSize: 9,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  nextStepTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
    textAlign: 'center',
  },
  nextStepContact: {
    fontSize: 10,
    color: '#3B82F6',
    textAlign: 'center',
  }
});

interface SavingsProposalPDFProps {
  result: any;
  monthStr: string;
  dailyData: any[];
  netProltSpend: number;
  netSavings: number;
  savingsPerc: string;
  displayMonth: string;
  charts: {
    consumptionMix: string;
    spendComparison: string;
    dailySavings: string;
    purchaseComparison: string;
  };
}

const formatCurrency = (val: number) => `Rs ${(val / 100000).toFixed(2)}L`;
const formatThousands = (val: number) => `Rs ${(val / 1000).toFixed(2)}K`;

export const SavingsProposalPDF: React.FC<SavingsProposalPDFProps> = ({
  result,
  dailyData,
  netProltSpend,
  netSavings,
  savingsPerc,
  displayMonth,
  charts,
  }) => {
  const renderFixedHeader = () => (
    <View style={styles.fixedHeader} fixed>
      <View>
        <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: 'bold' }}>PROLT SAVINGS REPORT</Text>
        <Text style={{ fontSize: 8, color: '#9CA3AF' }}>{displayMonth}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ alignItems: 'flex-end', marginRight: 20 }}>
          <Text style={{ fontSize: 8, color: '#6B7280', textTransform: 'uppercase' }}>Actual Spend</Text>
          <Text style={{ fontSize: 12, color: '#111827', fontWeight: 'bold' }}>{formatCurrency(result.totalBaselineCost)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 8, color: '#0369A1', textTransform: 'uppercase' }}>Net Saving</Text>
          <Text style={{ fontSize: 12, color: '#0284C7', fontWeight: 'bold' }}>{netSavings > 0 ? (netSavings >= 100000 ? formatCurrency(netSavings) : formatThousands(netSavings)) : 'Rs 0'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {renderFixedHeader()}
        <View style={styles.titleSection}>
          <Text style={styles.redSubtitle}>SAVINGS ANALYSIS / {displayMonth}</Text>
          {netSavings > 0 ? (
            <Text style={styles.mainHeadline}>
              Great news — your bill could{'\n'}
              drop by <Text style={styles.redHighlightText}>{netSavings >= 100000 ? formatCurrency(netSavings) : formatThousands(netSavings)}</Text> <Text style={styles.highlightText}>({savingsPerc}% reduction).</Text>
            </Text>
          ) : (
            <Text style={styles.mainHeadline}>
              <Text style={{ color: '#991B1B', fontWeight: 800 }}>Not Eligible for Open Access</Text>
            </Text>
          )}
          <Text style={styles.description}>
            Total potential savings across 1 month, based on the consumption you shared with the Prolt Savings Calculator. This document summarises what you are paying today, the mix Prolt recommends, and the daily breakdown behind the projected saving.
          </Text>
        </View>

        <View style={styles.kpiRow} wrap={false}>
          <View style={styles.kpiCardActual}>
            <Text style={styles.kpiLabelActual}>Actual Spend</Text>
            <Text style={styles.kpiValueActual}>{formatCurrency(result.totalBaselineCost)}</Text>
          </View>
          <View style={styles.kpiCardProlt}>
            <Text style={styles.kpiLabelProlt}>{netSavings > 0 ? 'Prolt Optimized Spend' : 'Simulated OA Spend'}</Text>
            <Text style={styles.kpiValueProlt}>{formatCurrency(netProltSpend)}</Text>
          </View>
          <View style={styles.kpiCardSavings}>
            <Text style={styles.kpiLabelSavings}>Prolt Projected Savings</Text>
            <Text style={styles.kpiValueSavings}>{netSavings > 0 ? (netSavings >= 100000 ? formatCurrency(netSavings) : formatThousands(netSavings)) : 'Rs 0'}</Text>
            {netSavings > 0 && <Text style={{ fontSize: 9, color: '#0369A1', marginTop: 4 }}>{savingsPerc}% reduction</Text>}
          </View>
        </View>

        <View style={styles.chartBox} wrap={false}>
          <Text style={styles.chartTitle}>Monthly Consumption Mix — DISCOM vs OA</Text>
          <Text style={{ fontSize: 10, color: '#6B7280', marginBottom: 10 }}>Your actual energy source mix vs Prolt's recommended distribution — {displayMonth}.</Text>
          {charts.consumptionMix ? (
            <Image style={styles.image} src={charts.consumptionMix} />
          ) : (
            <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Chart not captured</Text>
          )}
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        {renderFixedHeader()}
        <View style={styles.chartBox} wrap={false}>
          <Text style={styles.chartTitle}>Monthly Spend Comparison</Text>
          {charts.spendComparison ? (
            <Image style={styles.image} src={charts.spendComparison} />
          ) : (
            <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Chart not captured</Text>
          )}
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        {renderFixedHeader()}
        <Text style={styles.redSubtitle}>02 MONTHLY DETAILS — {displayMonth}</Text>
        <Text style={styles.description}>
          A day-by-day view of the same month. The first panel shows how much you could save on each day; the two panels below compare how energy was actually purchased against Prolt's recommended split.
        </Text>

        <View style={styles.chartBox} wrap={false}>
          <Text style={styles.chartTitle}>Daily Savings Opportunity — {displayMonth}</Text>
          {charts.dailySavings ? (
            <Image style={{ width: '100%', height: 140, objectFit: 'contain' }} src={charts.dailySavings} />
          ) : null}
        </View>

        <View style={styles.chartBox} wrap={false}>
          <Text style={styles.chartTitle}>How You Should Purchase</Text>
          {charts.purchaseComparison ? (
            <Image style={{ width: '100%', height: 140, objectFit: 'contain' }} src={charts.purchaseComparison} />
          ) : null}
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        {renderFixedHeader()}
        <Text style={styles.chartTitle}>Prolt Suggested Daily Breakdown</Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeader} wrap={false}>
            <Text style={[styles.col1, styles.colHeader]}>DAY</Text>
            <Text style={[styles.col2, styles.colHeader]}>TOTAL UNITS</Text>
            <Text style={[styles.col3, styles.colHeader]}>OA UNITS</Text>
            <Text style={[styles.col4, styles.colHeader, { color: '#6B7280' }]}>DISCOM UNITS</Text>
            <Text style={[styles.col5, styles.colHeader]}>YOU PAID</Text>
            <Text style={[styles.col6, styles.colHeader]}>PROLT SUGGESTED</Text>
            <Text style={[styles.col7, styles.colHeader, { color: '#6B7280' }]}>SAVING</Text>
          </View>
          
          {dailyData.slice(0, 31).map((row: any, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <Text style={styles.col1}>Day {row.dayLabel}</Text>
              <Text style={styles.col2}>{(row.totalUnits/1000).toFixed(2)}K</Text>
              <Text style={styles.col3}>{row.oaUnits > 0 ? row.oaUnits.toFixed(2) : '-'}</Text>
              <Text style={styles.col4}>{row.discomUnits.toFixed(2)}</Text>
              <Text style={styles.col5}>{formatThousands(row.actualSpend)}</Text>
              <Text style={styles.col6}>{formatThousands(row.proltSpend)}</Text>
              <Text style={row.savings > 0 ? styles.col7 : styles.col6}>
                {formatThousands(row.savings)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 8, color: '#9CA3AF', marginTop: 10, fontStyle: 'italic' }}>
          Showing full daily breakdown available in your Prolt dashboard.
        </Text>

        <View style={styles.glossaryBox} wrap={false}>
          <View style={styles.glossaryLeft}>
            <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 }}>TERMS USED</Text>
            <Text style={styles.glossaryTerm}>DISCOM</Text>
            <Text style={styles.glossaryDesc}>The local electricity distribution company you buy power from today.</Text>
            
            <Text style={styles.glossaryTerm}>Open Access (OA)</Text>
            <Text style={styles.glossaryDesc}>Direct procurement from generators, typically at a lower per-unit cost.</Text>
          </View>
          <View style={styles.glossaryRight}>
            <Text style={styles.nextStepText}>NEXT STEP</Text>
            <Text style={styles.nextStepTitle}>Talk to Prolt to activate this mix.</Text>
            <Text style={styles.nextStepContact}>info@probus.io  •  www.prolt.energy</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
