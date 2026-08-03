import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface AppDatePickerModalProps {
  visible: boolean;
  value?: string | null; // Format: YYYY-MM-DD
  title?: string;
  onConfirm: (formattedDate: string) => void;
  onClose: () => void;
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_HEADINGS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function AppDatePickerModal({
  visible,
  value,
  title = 'Pilih Tanggal',
  onConfirm,
  onClose,
}: AppDatePickerModalProps) {
  const { colors, typography, radius } = useAppTheme();

  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Mode: 'calendar' or 'year_picker'
  const [pickerMode, setPickerMode] = useState<'calendar' | 'year'>('calendar');

  useEffect(() => {
    if (visible) {
      setPickerMode('calendar');
      if (value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        const parts = value.trim().split('-');
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          setCurrentYear(y);
          setCurrentMonth(m);
          setSelectedDay(d);
          return;
        }
      }
      const now = new Date();
      setCurrentYear(now.getFullYear());
      setCurrentMonth(now.getMonth());
      setSelectedDay(now.getDate());
    }
  }, [visible, value]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDay(now.getDate());
  };

  const handleConfirmDate = () => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(selectedDay).padStart(2, '0');
    const resultStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onConfirm(resultStr);
    onClose();
  };

  // Generate array of years from 1990 to 2035
  const yearsList = Array.from({ length: 46 }, (_, i) => 1990 + i);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="calendar-outline" size={20} color="#059669" style={{ marginRight: 6 }} />
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.foreground} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPickerMode((m) => (m === 'calendar' ? 'year' : 'calendar'))}
              style={styles.monthYearTitleBox}
            >
              <Text style={[styles.monthYearText, { color: colors.foreground }]}>
                {MONTH_NAMES_ID[currentMonth]} {currentYear}
              </Text>
              <Ionicons
                name={pickerMode === 'year' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#059669"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Content Body: Calendar Grid or Year Selector */}
          {pickerMode === 'year' ? (
            <View style={styles.yearPickerContainer}>
              <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: '600' }}>
                Pilih Tahun:
              </Text>
              <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={styles.yearGrid}>
                {yearsList.map((y) => {
                  const isSelected = y === currentYear;
                  return (
                    <TouchableOpacity
                      key={y}
                      onPress={() => {
                        setCurrentYear(y);
                        setPickerMode('calendar');
                      }}
                      style={[
                        styles.yearItem,
                        {
                          backgroundColor: isSelected ? '#059669' : '#f1f5f9',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.yearItemText,
                          { color: isSelected ? '#ffffff' : '#334155' },
                        ]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.calendarContainer}>
              {/* Day Headings */}
              <View style={styles.dayHeadingsRow}>
                {DAY_HEADINGS.map((dh) => (
                  <Text key={dh} style={styles.dayHeadingText}>
                    {dh}
                  </Text>
                ))}
              </View>

              {/* Day Grid */}
              <View style={styles.dayGrid}>
                {/* Empty slots for offset */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected = dayNum === selectedDay;
                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: '#059669', borderRadius: 20 },
                      ]}
                      onPress={() => setSelectedDay(dayNum)}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          { color: isSelected ? '#ffffff' : colors.foreground },
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quick Date Display */}
          <View style={styles.selectedDateBadge}>
            <Text style={styles.selectedDateBadgeText}>
              Terpilih: {selectedDay} {MONTH_NAMES_ID[currentMonth]} {currentYear} (
              {currentYear}-{String(currentMonth + 1).padStart(2, '0')}-
              {String(selectedDay).padStart(2, '0')})
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.todayBtn} onPress={handleToday}>
              <Text style={styles.todayBtnText}>Hari Ini</Text>
            </TouchableOpacity>

            <View style={styles.rightActionBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmDate}>
                <Text style={styles.confirmBtnText}>Pilih</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeIcon: {
    padding: 4,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 14,
  },
  navBtn: {
    padding: 6,
  },
  monthYearTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '700',
  },
  calendarContainer: {
    width: '100%',
  },
  dayHeadingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dayHeadingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    width: 36,
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 38,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '600',
  },
  yearPickerContainer: {
    width: '100%',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  yearItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  yearItemText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedDateBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  selectedDateBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#047857',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  todayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  todayBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#059669',
  },
  rightActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#059669',
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});
