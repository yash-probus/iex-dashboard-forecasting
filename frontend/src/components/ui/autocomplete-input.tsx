import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyMessage?: string;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

export function AutocompleteInput({
  value,
  onValueChange,
  options,
  placeholder = "Type to search...",
  emptyMessage = "No results found",
  error = false,
  className,
  disabled = false,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inputValue with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter options based on input
  const filteredOptions = inputValue.length >= 1
    ? options.filter((option) => {
        const lowerInput = inputValue.toLowerCase();
        const lowerOption = option.toLowerCase();
        return lowerOption.startsWith(lowerInput) || lowerOption.includes(lowerInput);
      }).slice(0, 10) // Limit to 10 results
    : [];

  // Reset selected index when filtered options change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredOptions.length]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setOpen(newValue.length >= 1);
    // Don't update parent until selection is made
  }, []);

  const handleSelect = useCallback((selectedOption: string) => {
    setInputValue(selectedOption);
    onValueChange(selectedOption);
    setOpen(false);
    inputRef.current?.blur();
  }, [onValueChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filteredOptions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[selectedIndex]) {
          handleSelect(filteredOptions[selectedIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    } 
  }, [open, filteredOptions, selectedIndex, handleSelect]);

  const handleBlur = useCallback(() => {
    // Delay to allow click on option
    setTimeout(() => {
      // If input doesn't match any option, clear or keep original
      const matchedOption = options.find(
        (opt) => opt.toLowerCase() === inputValue.toLowerCase()
      );
      if (matchedOption) {
        setInputValue(matchedOption);
        onValueChange(matchedOption);
      } else if (inputValue && !matchedOption) {
        // Clear invalid input
        setInputValue(value);
      }
      setOpen(false);
    }, 200);
  }, [inputValue, options, onValueChange, value]);

  // Highlight matched text in option
  const highlightMatch = (option: string, query: string) => {
    if (!query) return option;
    
    const lowerOption = option.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerOption.indexOf(lowerQuery);
    
    if (index === -1) return option;
    
    return (
      <>
        {option.slice(0, index)}
        <span className="font-semibold text-primary">
          {option.slice(index, index + query.length)}
        </span>
        {option.slice(index + query.length)}
      </>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length >= 1 && setOpen(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "h-9",
              error && "border-destructive",
              className
            )}
            autoComplete="off"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-[--radix-popover-trigger-width] z-50 bg-popover" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-[200px] overflow-y-auto">
            {filteredOptions.length === 0 && inputValue.length >= 1 ? (
              <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option, index) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                    className={cn(
                      "cursor-pointer",
                      selectedIndex === index && "bg-accent"
                    )}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {highlightMatch(option, inputValue)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
