"use client";

import { ChatRequestOptions, CreateMessage, Message } from "ai";
import cx from "classnames";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ArrowUpIcon, MessageIcon, PenIcon, SummarizeIcon } from "./icons";
import useClickOutside from "./use-click-outside";

type ToolProps = {
  type: "final-polish" | "request-suggestions" | "adjust-reading-level";
  description: string;
  icon: JSX.Element;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  isToolbarVisible?: boolean;
  setIsToolbarVisible?: Dispatch<SetStateAction<boolean>>;
  isAnimating: boolean;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
};

const Tool = ({
  type,
  description,
  icon,
  selectedTool,
  setSelectedTool,
  isToolbarVisible,
  setIsToolbarVisible,
  isAnimating,
  append,
}: ToolProps) => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (selectedTool !== type) {
      setIsHovered(false);
    }
  }, [selectedTool, type]);

  return (
    <Tooltip open={isHovered && !isAnimating}>
      <TooltipTrigger>
        <motion.div
          className={cx("p-3 rounded-full", {
            "bg-foreground !text-background": selectedTool === type,
          })}
          onHoverStart={() => {
            setIsHovered(true);
          }}
          onHoverEnd={() => {
            if (selectedTool !== type) setIsHovered(false);
          }}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.1 } }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          exit={{
            scale: 0.9,
            opacity: 0,
            transition: { duration: 0.1 },
          }}
          onClick={() => {
            if (!isToolbarVisible && setIsToolbarVisible) {
              setIsToolbarVisible(true);
              return;
            }

            if (!selectedTool) {
              setIsHovered(true);
              setSelectedTool(type);
              return;
            }

            if (selectedTool !== type) {
              setSelectedTool(type);
            } else {
              if (type === "final-polish") {
                append({
                  role: "user",
                  content:
                    "Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly.",
                });

                setSelectedTool(null);
              } else if (type === "request-suggestions") {
                append({
                  role: "user",
                  content:
                    "Please add suggestions you have that could improve the writing.",
                });

                setSelectedTool(null);
              }
            }
          }}
        >
          {selectedTool === type ? <ArrowUpIcon /> : icon}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={16}
        className="bg-foreground text-background rounded-2xl p-3 px-4"
      >
        {description}
      </TooltipContent>
    </Tooltip>
  );
};

const ReadingLevelSelector = ({
  setSelectedTool,
  append,
  isAnimating,
}: {
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  isAnimating: boolean;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}) => {
  const LEVELS = [
    "Elementary",
    "Middle School",
    "Keep current level",
    "High School",
    "College",
    "Graduate",
  ];

  const y = useMotionValue(-40 * 2);
  const dragConstraints = 5 * 40 + 2;
  const yToLevel = useTransform(y, [0, -dragConstraints], [0, 5]);

  const [currentLevel, setCurrentLevel] = useState(2);
  const [hasUserSelectedLevel, setHasUserSelectedLevel] =
    useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = yToLevel.on("change", (latest) => {
      const level = Math.min(5, Math.max(0, Math.round(Math.abs(latest))));
      setCurrentLevel(level);
    });

    return () => unsubscribe();
  }, [yToLevel]);

  return (
    <div className="relative flex flex-col justify-end items-center">
      {/* Dots */}
      {[...Array(6)].map((_, index) => (
        <motion.div
          key={`dot-${index}`}
          className="size-[40px] flex flex-row items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="size-2 rounded-full bg-muted-foreground/40" />
        </motion.div>
      ))}

      <TooltipProvider>
        <Tooltip open={!isAnimating}>
          <TooltipTrigger asChild>
            <motion.div
              className={cx(
                "absolute bg-background p-3 border rounded-full flex flex-row items-center",
                {
                  "bg-foreground text-background": currentLevel !== 2,
                  "bg-background text-foreground": currentLevel === 2,
                },
              )}
              style={{ y }}
              drag="y"
              dragElastic={0}
              dragMomentum={false}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              dragConstraints={{ top: -dragConstraints, bottom: 0 }}
              onDragStart={() => {
                setHasUserSelectedLevel(false);
              }}
              onDragEnd={() => {
                if (currentLevel === 2) {
                  setSelectedTool(null);
                } else {
                  setHasUserSelectedLevel(true);
                }
              }}
              onClick={() => {
                if (currentLevel !== 2 && hasUserSelectedLevel) {
                  append({
                    role: "user",
                    content: `Please adjust the reading level to ${LEVELS[currentLevel]} level.`,
                  });

                  setSelectedTool(null);
                }
              }}
            >
              {currentLevel === 2 ? <SummarizeIcon /> : <ArrowUpIcon />}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            sideOffset={16}
            className="bg-foreground text-background text-sm rounded-2xl p-3 px-4"
          >
            {LEVELS[currentLevel]}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export const Toolbar = ({
  isToolbarVisible,
  setIsToolbarVisible,
  append,
}: {
  isToolbarVisible: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useClickOutside(toolbarRef, () => {
    setIsToolbarVisible(false);
    setSelectedTool(null);
  });

  const Tools = (
    <>
      <AnimatePresence>
        {isToolbarVisible && (
          <>
            <Tool
              type="adjust-reading-level"
              description="Adjust reading level"
              icon={<SummarizeIcon />}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              append={append}
              isAnimating={isAnimating}
            />

            <Tool
              type="request-suggestions"
              description="Request suggestions"
              icon={<MessageIcon />}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              append={append}
              isAnimating={isAnimating}
            />
          </>
        )}
      </AnimatePresence>

      <Tool
        type="final-polish"
        description="Add final polish"
        icon={<PenIcon />}
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        isToolbarVisible={isToolbarVisible}
        setIsToolbarVisible={setIsToolbarVisible}
        append={append}
        isAnimating={isAnimating}
      />
    </>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        className="cursor-pointer fixed right-6 bottom-6 p-1.5 border rounded-full shadow-lg bg-background flex flex-col justify-end"
        initial={{ opacity: 0, y: -20, scale: 1 }}
        animate={
          isToolbarVisible
            ? selectedTool === "adjust-reading-level"
              ? {
                  opacity: 1,
                  y: 0,
                  height: 6 * 43,
                  transition: { delay: 0 },
                  scale: 0.95,
                }
              : {
                  opacity: 1,
                  y: 0,
                  height: 3 * 45,
                  transition: { delay: 0 },
                  scale: 1,
                }
            : { opacity: 1, y: 0, height: 54, transition: { delay: 0 } }
        }
        exit={{ opacity: 0, y: -20, transition: { duration: 0.1 } }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onHoverStart={() => {
          setIsToolbarVisible(true);
        }}
        onHoverEnd={() => {
          setSelectedTool(null);
          setIsToolbarVisible(false);
        }}
        onAnimationStart={() => {
          setIsAnimating(true);
        }}
        onAnimationComplete={() => {
          setIsAnimating(false);
        }}
        ref={toolbarRef}
      >
        {selectedTool === "adjust-reading-level" ? (
          <ReadingLevelSelector
            append={append}
            setSelectedTool={setSelectedTool}
            isAnimating={isAnimating}
          />
        ) : (
          Tools
        )}
      </motion.div>
    </TooltipProvider>
  );
};
