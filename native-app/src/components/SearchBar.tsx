import React, { useState, useEffect, useRef } from 'react';
import { Searchbar as PaperSearchbar } from 'react-native-paper';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search...', debounceMs = 300 }: Props) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (text: string) => {
    setLocal(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeText(text), debounceMs);
  };

  return (
    <PaperSearchbar
      placeholder={placeholder}
      value={local}
      onChangeText={handleChange}
      style={{ marginHorizontal: 16, marginVertical: 8 }}
    />
  );
}
