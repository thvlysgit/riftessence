import React, { useId, useState } from 'react';
import Image from 'next/image';
type Option = { id: string; name: string };
export default function ChampionSearch({
  champions,
  excluded,
  version,
  disabled,
  onGuess,
}: {
  champions: Option[];
  excluded: string[];
  version: string;
  disabled: boolean;
  onGuess: (id: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState('');
  const [selection, setSelection] = useState<Option | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const options = champions
    .filter(
      (c) => !excluded.includes(c.id) && c.name.toLowerCase().includes(value.trim().toLowerCase()),
    )
    .slice(0, 8);
  const choose = (option: Option) => {
    setValue(option.name);
    setSelection(option);
    setOpen(false);
  };
  return (
    <form
      className="essence-guess-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (selection && !disabled) {
          onGuess(selection.id);
          setValue('');
          setSelection(null);
          setOpen(false);
        }
      }}
    >
      <div className="essence-search">
        <input
          className="essence-input"
          role="combobox"
          aria-label="Search for a champion"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && options[index] ? `${id}-${index}` : undefined}
          autoComplete="off"
          placeholder="Search for a champion"
          value={value}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) setOpen(false);
          }}
          onChange={(e) => {
            setValue(e.target.value);
            setSelection(null);
            setIndex(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
              setIndex((i) =>
                Math.max(0, Math.min(options.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))),
              );
            }
            if (e.key === 'Enter' && open && options[index]) {
              e.preventDefault();
              choose(options[index]);
            }
          }}
        />
        {open && !disabled ? (
          <ul className="essence-options" id={`${id}-list`} role="listbox" aria-label="Champions">
            {options.map((option, i) => (
              <li key={option.id} role="option" id={`${id}-${i}`} aria-selected={index === i}>
                <button
                  type="button"
                  className="essence-option"
                  tabIndex={-1}
                  data-selected={index === i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <Image
                    src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${option.id}.png`}
                    width={30}
                    height={30}
                    alt=""
                  />
                  <span>{option.name}</span>
                </button>
              </li>
            ))}
            {!options.length ? <li className="essence-option">No matching champions</li> : null}
          </ul>
        ) : null}
      </div>
      <button className="essence-button" type="submit" disabled={disabled || !selection}>
        {disabled ? 'Checking…' : 'Guess'}
      </button>
    </form>
  );
}
