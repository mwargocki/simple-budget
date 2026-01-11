import { useAISummary } from "@/components/hooks/useAISummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useMemo } from "react";

interface AISummaryProps {
  accessToken: string;
  month: string;
}

function parseMarkdownToElements(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag key={elements.length} className={listType === "ul" ? "list-disc" : "list-decimal"}>
          {listItems.map((item, i) => (
            <li key={i}>{parseInlineMarkdown(item)}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  for (const line of lines) {
    // Headers
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={elements.length} className="font-semibold text-base mt-4 mb-2 first:mt-0">
          {parseInlineMarkdown(line.slice(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={elements.length} className="font-semibold text-lg mt-5 mb-2 first:mt-0">
          {parseInlineMarkdown(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={elements.length} className="font-bold text-xl mt-6 mb-3 first:mt-0">
          {parseInlineMarkdown(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s+/)) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={elements.length} className="mb-3 last:mb-0">
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  flushList();
  return elements;
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(
        <strong key={keyCounter++} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Italic *text* or _text_
    const italicMatch = remaining.match(/(?:\*|_)(.+?)(?:\*|_)/);
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        parts.push(remaining.slice(0, italicMatch.index));
      }
      parts.push(
        <em key={keyCounter++} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      continue;
    }

    // No more matches, add remaining text
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : parts;
}

export function AISummary({ accessToken, month }: AISummaryProps) {
  const { analysis, isGenerating, error, generateAnalysis } = useAISummary(accessToken, month);

  const formattedAnalysis = useMemo(() => {
    if (!analysis) return null;
    return parseMarkdownToElements(analysis);
  }, [analysis]);

  return (
    <section aria-label="Analiza AI" className="space-y-4">
      <Button onClick={generateAnalysis} disabled={isGenerating} className="w-full sm:w-auto">
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin" />
            Generowanie...
          </>
        ) : (
          <>
            <Sparkles />
            Generuj podsumowanie
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {formattedAnalysis && (
        <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              Analiza AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed text-foreground/90 [&_ul]:ml-4 [&_ul]:mb-3 [&_ul]:space-y-1 [&_ol]:ml-4 [&_ol]:mb-3 [&_ol]:space-y-1 [&_li]:pl-1">
              {formattedAnalysis}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
