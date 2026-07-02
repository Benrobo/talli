import { motion } from "motion/react";
import { MobileScreen } from "@/components/layout";

export function PayLoading() {
  return (
    <MobileScreen>
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="size-8 rounded-full border-[3px] border-hairline border-t-iris"
        />
      </div>
    </MobileScreen>
  );
}
