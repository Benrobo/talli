import { useRef, useEffect, cloneElement, isValidElement, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactElement, ReactNode } from "react";
import tippy from "tippy.js";
import type { Placement, Props as TippyProps, Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import "@/styles/tippy-themes.css";

export interface TippyTooltipProps {
  children: ReactElement;
  content: ReactNode;
  placement?: Placement;
  delay?: number | [number, number];
  duration?: number | [number, number];
  arrow?: boolean;
  interactive?: boolean;
  maxWidth?: number | string;
  offset?: [number, number];
  trigger?: string;
  disabled?: boolean;
  theme?: "dark" | "light";
  appendTo?: "parent" | Element | (() => Element);
  hideOnClick?: boolean | "toggle";
  onShow?: (instance: Instance) => void | false;
  onHide?: (instance: Instance) => void | false;
}

export function TippyTooltip({
  children,
  content,
  placement = "top",
  delay = [200, 0],
  duration = [150, 100],
  arrow = true,
  interactive = false,
  maxWidth = 300,
  offset = [0, 8],
  trigger = "mouseenter focus",
  disabled = false,
  theme = "dark",
  appendTo,
  hideOnClick,
  onShow,
  onHide,
}: TippyTooltipProps) {
  const ref = useRef<HTMLElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [container] = useState(() => document.createElement("div"));

  useEffect(() => {
    if (!ref.current) return;

    const tippyConfig: Partial<TippyProps> = {
      placement,
      delay: Array.isArray(delay) ? delay : [delay, 0],
      duration: Array.isArray(duration) ? duration : [duration, duration],
      arrow,
      interactive,
      maxWidth,
      offset,
      trigger,
      theme: theme === "dark" ? "talli-dark" : "talli-light",
      animation: "shift-away-subtle",
      moveTransition: "transform 0.15s ease-out",
      appendTo: appendTo === "parent" ? "parent" : appendTo || (() => document.body),
      hideOnClick: hideOnClick ?? (interactive ? false : true),
      onShow,
      onHide,
      allowHTML: true,
    };

    if (typeof content === "string") {
      tippyConfig.content = content;
    } else {
      tippyConfig.content = container;
    }

    instanceRef.current = tippy(ref.current, tippyConfig);

    if (disabled) instanceRef.current.disable();

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!instanceRef.current) return;
    if (typeof content === "string") {
      instanceRef.current.setContent(content);
    } else {
      instanceRef.current.setContent(container);
    }
  }, [content, container]);

  useEffect(() => {
    if (!instanceRef.current) return;
    instanceRef.current.setProps({ placement });
  }, [placement]);

  useEffect(() => {
    if (!instanceRef.current) return;
    if (disabled) {
      instanceRef.current.disable();
    } else {
      instanceRef.current.enable();
    }
  }, [disabled]);

  if (!isValidElement(children)) return children;

  return (
    <>
      {cloneElement(children as ReactElement<any>, { ref })}
      {typeof content !== "string" && createPortal(content, container)}
    </>
  );
}

export default TippyTooltip;
