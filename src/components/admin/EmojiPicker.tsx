import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😛', '🤪', '😜', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  gestures: ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🤙', '👋', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤳', '💅', '🖕', '☝️', '👆', '👇', '👈', '👉', '🫵', '🫶'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '🫀', '💌'],
  objects: ['📱', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '📷', '📹', '🎥', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⌚', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰'],
  symbols: ['✅', '❌', '⭕', '🚫', '❗', '❓', '‼️', '⁉️', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '💠', '🔘', '🔳', '🔲', '⬛', '⬜', '◾', '◽', '▪️', '▫️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '🔄', '✨', '⭐', '🌟', '💫', '🔥', '💥', '⚡', '🎉', '🎊'],
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  triggerClassName?: string;
}

export const EmojiPicker = ({ onSelect, triggerClassName }: EmojiPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClassName} aria-label="Insert emoji">
          <Smile className="h-5 w-5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="top" aria-label="Emoji picker">
        <div className="border-b p-2">
          <p className="mb-2 text-xs text-muted-foreground">Quick reactions</p>
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => handleSelect(emoji)} aria-label={`Insert ${emoji}`} className="rounded p-1 text-2xl transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{emoji}</button>
            ))}
          </div>
        </div>
        <Tabs defaultValue="smileys" className="w-full">
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            {Object.keys(EMOJI_CATEGORIES).map((category) => <TabsTrigger key={category} value={category} className="rounded-none py-2 text-lg data-[state=active]:bg-muted" aria-label={`${category} emojis`}>{EMOJI_CATEGORIES[category as keyof typeof EMOJI_CATEGORIES][0]}</TabsTrigger>)}
          </TabsList>
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <TabsContent key={category} value={category} className="m-0">
              <div className="h-48 overflow-y-auto p-2">
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((emoji) => <button key={emoji} type="button" onClick={() => handleSelect(emoji)} aria-label={`Insert ${emoji}`} className="flex aspect-square items-center justify-center rounded p-1 text-xl transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{emoji}</button>)}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  existingReactions?: string[];
}

export const ReactionPicker = ({ onReact, existingReactions = [] }: ReactionPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" aria-label="Add message reaction">
          <Smile className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top" align="start">
        <div className="flex gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <motion.button
              key={emoji}
              type="button"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { onReact(emoji); setIsOpen(false); }}
              aria-label={`${existingReactions.includes(emoji) ? 'Remove' : 'Add'} ${emoji} reaction`}
              className={`rounded p-1 text-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${existingReactions.includes(emoji) ? 'bg-primary/20' : 'hover:bg-muted'}`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
