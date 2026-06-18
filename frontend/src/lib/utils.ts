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
    if (!html) return "";
    const processedHtml = html.replace(/&nbsp;/g, " ");

    if (typeof window === "undefined") return "";

    const sanitizedHtml = DOMPurify.sanitize(processedHtml, {
        ALLOWED_TAGS: [
            "p", "br", "b", "i", "em", "strong", "u", "s", "a", "ul", "ol", "li",
            "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
            "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td",
            "div", "span", "hr", "sub", "sup", "iframe",
        ],
        ALLOWED_ATTR: [
            "href", "target", "rel", "src", "alt", "title", "class", "style",
            "width", "height", "id", "colspan", "rowspan",
            "allow", "allowfullscreen", "frameborder",
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        ADD_ATTR: ["loading", "referrerpolicy"],
    });

    const template = document.createElement("template");
    template.innerHTML = sanitizedHtml;

    template.content.querySelectorAll("iframe").forEach((iframe) => {
        const src = iframe.getAttribute("src") || "";
        const isAllowedVideo = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//i.test(src);

        if (!isAllowedVideo) {
            iframe.remove();
            return;
        }

        iframe.setAttribute("loading", "lazy");
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    });

    template.content.querySelectorAll("a[target=\"_blank\"]").forEach((link) => {
        link.setAttribute("rel", "noopener noreferrer");
    });

    return template.innerHTML;
}
