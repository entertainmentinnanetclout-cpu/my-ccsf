import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😛', '🤪', '😜', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  gestures: ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🤙', '👋', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤳', '💅', '🖕', '☝️', '👆', '👇', '👈', '👉', '🫵', '🫶'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '🫀', '💌'],
  objects: ['📱', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '📷', '📹', '🎥', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⌚', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰'],
  symbols: ['✅', '❌', '⭕', '🚫', '❗', '❓', '‼️', '⁉️', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '💠', '🔘', '🔳', '🔲', '⬛', '⬜', '◾', '◽', '▪️', '▫️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '🔄', '✨', '⭐', '🌟', '💫', '🔥', '💥', '⚡', '🎉', '🎊']
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
        <Button 
          variant="ghost" 
          size="icon" 
          className={triggerClassName}
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        side="top"
      >
        <div className="p-2 border-b">
          <p className="text-xs text-muted-foreground mb-2">Quick reactions</p>
          <div className="flex gap-1">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="text-2xl hover:bg-muted rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        
        <Tabs defaultValue="smileys" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-transparent">
            <TabsTrigger value="smileys" className="text-lg py-2 data-[state=active]:bg-muted rounded-none">😀</TabsTrigger>
            <TabsTrigger value="gestures" className="text-lg py-2 data-[state=active]:bg-muted rounded-none">👍</TabsTrigger>
            <TabsTrigger value="hearts" className="text-lg py-2 data-[state=active]:bg-muted rounded-none">❤️</TabsTrigger>
            <TabsTrigger value="objects" className="text-lg py-2 data-[state=active]:bg-muted rounded-none">📱</TabsTrigger>
            <TabsTrigger value="symbols" className="text-lg py-2 data-[state=active]:bg-muted rounded-none">✅</TabsTrigger>
          </TabsList>
          
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <TabsContent key={category} value={category} className="m-0">
              <div className="h-48 overflow-y-auto p-2">
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleSelect(emoji)}
                      className="text-xl hover:bg-muted rounded p-1 transition-colors aspect-square flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

// Mini reaction picker for messages
interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  existingReactions?: string[];
}

export const ReactionPicker = ({ onReact, existingReactions = [] }: ReactionPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top" align="start">
        <div className="flex gap-1">
          {QUICK_REACTIONS.map(emoji => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                onReact(emoji);
                setIsOpen(false);
              }}
              className={`text-xl p-1 rounded transition-colors ${
                existingReactions.includes(emoji) 
                  ? 'bg-primary/20' 
                  : 'hover:bg-muted'
              }`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
