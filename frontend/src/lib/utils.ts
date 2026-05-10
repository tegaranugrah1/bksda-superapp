import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from "dayjs"
import "dayjs/locale/id"
import DOMPurify from "dompurify"

dayjs.locale("id")

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (date: string | null | undefined, format = "D MMM YYYY") => {
  if (!date) return "-"
  return dayjs(date).format(format)
}

export function sanitizeHtml(html: string): string {
    if (!html) return '';
    const processedHtml = html.replace(/&nbsp;/g, ' ');

    if (typeof window === 'undefined') return processedHtml; // SSR fallback
    return DOMPurify.sanitize(processedHtml, {
        ALLOWED_TAGS: [
            'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'a', 'ul', 'ol', 'li',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
            'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'span', 'hr', 'sub', 'sup', 'iframe',
        ],
        ALLOWED_ATTR: [
            'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style',
            'width', 'height', 'id', 'colspan', 'rowspan',
            'allow', 'allowfullscreen', 'frameborder',
        ],
    });
}
