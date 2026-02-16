export type AdhanValue = "makkah" | "madinah" | "alaqsa" | "egypt" | "silent";

export interface AdhanOption {
  label: string;
  value: AdhanValue;
  previewSource?: number;
  notificationSound?: string;
}

export const DEFAULT_ADHAN: AdhanValue = "makkah";

export const ADHAN_OPTIONS: AdhanOption[] = [
  {
    label: "Adhan 1",
    value: "makkah",
    previewSource: require("../assets/adhan/azan1.mp3"),
    notificationSound: "azan1.mp3",
  },
  {
    label: "Adhan 2",
    value: "madinah",
    previewSource: require("../assets/adhan/azan2.mp3"),
    notificationSound: "azan2.mp3",
  },
  {
    label: "Adhan 3",
    value: "alaqsa",
    previewSource: require("../assets/adhan/azan3.mp3"),
    notificationSound: "azan3.mp3",
  },
  {
    label: "Adhan 4",
    value: "egypt",
    previewSource: require("../assets/adhan/azan4.mp3"),
    notificationSound: "azan4.mp3",
  },
  {
    label: "Silent",
    value: "silent",
    previewSource: undefined,
    notificationSound: undefined,
  },
];

export const getAdhanByValue = (value?: string) =>
  ADHAN_OPTIONS.find((option) => option.value === value) ?? ADHAN_OPTIONS[0];
