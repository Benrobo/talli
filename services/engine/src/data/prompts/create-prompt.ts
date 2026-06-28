export interface PromptTemplate<T> {
  template: string;
  replace(values: T): string;
}

export function createPrompt<T extends Record<string, string>>(
  template: string
): PromptTemplate<T> {
  return {
    template,
    replace(values: T): string {
      return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
        const value = values[key];
        return value !== undefined ? value : match;
      });
    },
  };
}
