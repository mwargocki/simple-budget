import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  describe("basic class merging", () => {
    it("should return empty string for no arguments", () => {
      const result = cn();

      expect(result).toBe("");
    });

    it("should return single class unchanged", () => {
      const result = cn("text-red-500");

      expect(result).toBe("text-red-500");
    });

    it("should merge multiple classes", () => {
      const result = cn("text-red-500", "bg-blue-500");

      expect(result).toBe("text-red-500 bg-blue-500");
    });

    it("should merge classes from array", () => {
      const result = cn(["text-red-500", "bg-blue-500"]);

      expect(result).toBe("text-red-500 bg-blue-500");
    });
  });

  describe("tailwind-merge deduplication", () => {
    it("should resolve conflicting text color classes (last wins)", () => {
      const result = cn("text-red-500", "text-blue-500");

      expect(result).toBe("text-blue-500");
    });

    it("should resolve conflicting padding classes", () => {
      const result = cn("p-4", "p-8");

      expect(result).toBe("p-8");
    });

    it("should resolve conflicting margin classes", () => {
      const result = cn("m-2", "m-4");

      expect(result).toBe("m-4");
    });

    it("should not merge non-conflicting classes", () => {
      const result = cn("p-4", "m-4", "text-red-500");

      expect(result).toBe("p-4 m-4 text-red-500");
    });

    it("should resolve px and py with p correctly", () => {
      const result = cn("px-4", "py-2", "p-6");

      expect(result).toBe("p-6");
    });

    it("should keep specific direction padding when overriding general", () => {
      const result = cn("p-4", "px-8");

      expect(result).toBe("p-4 px-8");
    });
  });

  describe("clsx conditional classes", () => {
    it("should handle boolean conditions - true", () => {
      const isActive = true;
      const result = cn("base-class", isActive && "active-class");

      expect(result).toBe("base-class active-class");
    });

    it("should handle boolean conditions - false", () => {
      const isActive = false;
      const result = cn("base-class", isActive && "active-class");

      expect(result).toBe("base-class");
    });

    it("should handle object syntax", () => {
      const result = cn("base-class", {
        "active-class": true,
        "disabled-class": false,
      });

      expect(result).toBe("base-class active-class");
    });

    it("should handle undefined and null values", () => {
      const result = cn("base-class", undefined, null, "other-class");

      expect(result).toBe("base-class other-class");
    });

    it("should handle empty strings", () => {
      const result = cn("base-class", "", "other-class");

      expect(result).toBe("base-class other-class");
    });

    it("should handle mixed inputs: strings, arrays, objects, and conditions", () => {
      const isVisible = true;
      const isDisabled = false;

      const result = cn(
        "base",
        ["flex", "items-center"],
        { hidden: !isVisible, "opacity-50": isDisabled },
        isVisible && "visible-class"
      );

      expect(result).toBe("base flex items-center visible-class");
    });
  });

  describe("complex scenarios", () => {
    it("should handle component variant pattern", () => {
      const baseStyles = "px-4 py-2 rounded";
      const variantStyles = "bg-blue-500 text-white";
      const sizeStyles = "text-sm";
      const customStyles = "bg-red-500"; // Override bg-blue-500

      const result = cn(baseStyles, variantStyles, sizeStyles, customStyles);

      expect(result).toBe("px-4 py-2 rounded text-white text-sm bg-red-500");
    });

    it("should handle responsive classes correctly", () => {
      const result = cn("text-sm", "md:text-base", "lg:text-lg");

      expect(result).toBe("text-sm md:text-base lg:text-lg");
    });

    it("should handle hover and focus states", () => {
      const result = cn("bg-white", "hover:bg-gray-100", "focus:ring-2");

      expect(result).toBe("bg-white hover:bg-gray-100 focus:ring-2");
    });

    it("should handle dark mode variants", () => {
      const result = cn("bg-white", "dark:bg-gray-900", "text-black", "dark:text-white");

      expect(result).toBe("bg-white dark:bg-gray-900 text-black dark:text-white");
    });
  });
});
