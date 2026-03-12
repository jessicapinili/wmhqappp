import { format, startOfWeek, endOfWeek, getWeek, getYear } from 'date-fns'

export const getWeekKey = (date = new Date()) => {
  const week = getWeek(date, { weekStartsOn: 1 })
  const year = getYear(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export const getMonthKey = (date = new Date()) => {
  return format(date, 'yyyy-MM')
}

export const getDateKey = (date = new Date()) => {
  return format(date, 'yyyy-MM-dd')
}

export const getDayOfYear = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

export const getWeekBounds = (date = new Date()) => {
  const mon = startOfWeek(date, { weekStartsOn: 1 })
  const sun = endOfWeek(date, { weekStartsOn: 1 })
  return {
    monday: format(mon, 'dd MMM'),
    sunday: format(sun, 'dd MMM'),
    year: format(sun, 'yyyy'),
    mondayFull: mon,
    sundayFull: sun,
  }
}

export const getQuarterFromMonth = (month) => {
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

export const getCurrentQuarter = () => {
  const month = new Date().getMonth() + 1
  return getQuarterFromMonth(month)
}

export const formatCurrency = (amount, currency = 'AUD') => {
  if (!amount && amount !== 0) return ''
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export const todayFormatted = () => {
  return format(new Date(), 'EEEE, d MMMM yyyy')
}
