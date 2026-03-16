import { StyleSheet } from '@react-pdf/renderer'

export const colors = {
  primary: '#2563EB',       // blue-600
  primaryLight: '#DBEAFE',  // blue-100
  secondary: '#7C3AED',     // purple-600
  success: '#16A34A',       // green-600
  warning: '#D97706',       // amber-600
  error: '#DC2626',         // red-600
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  white: '#FFFFFF',
}

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.gray700,
  },
  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 4,
  },
  headerBrand: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray900,
  },
  headerDate: {
    fontSize: 9,
    color: colors.gray400,
    marginTop: 2,
  },
  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 6,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray900,
    marginTop: 4,
  },
  // Table
  tableContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  tableTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray900,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.gray100,
  },
  tableCell: {
    fontSize: 9,
    color: colors.gray700,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: colors.gray200,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: colors.gray400,
  },
  // Section
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray900,
    marginTop: 16,
    marginBottom: 8,
  },
  // Status badges
  statusSuccess: {
    fontSize: 8,
    color: colors.success,
    fontFamily: 'Helvetica-Bold',
  },
  statusError: {
    fontSize: 8,
    color: colors.error,
    fontFamily: 'Helvetica-Bold',
  },
  statusWarning: {
    fontSize: 8,
    color: colors.warning,
    fontFamily: 'Helvetica-Bold',
  },
})
