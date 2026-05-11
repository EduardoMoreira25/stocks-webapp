// Utility to parse KPI text files from /kpis directory

export interface ParsedKPI {
  title: string;
  description: string;
  formula?: {
    title: string;
    equation: string;
  };
  explanation?: string;
  example?: {
    title: string;
    items: string[];
    conclusion?: string;
  };
  whatIsGood?: {
    title: string;
    items: string[];
  };
  whyMatters?: {
    title: string;
    items: { label: string; description?: string }[];
  };
  components?: {
    title: string;
    items: { label: string; description?: string }[];
  };
}

export async function loadKPIContent(slug: string): Promise<ParsedKPI | null> {
  try {
    // Convert slug to filename (e.g., "cash-and-debt" -> "cash_&_debt")
    const filename = slug
      .replace(/-and-/g, '_&_')
      .replace(/-/g, '_');

    const response = await fetch(`/kpis/${filename}`);
    if (!response.ok) return null;

    const text = await response.text();
    return parseKPIText(text, slug);
  } catch (error) {
    console.error('Error loading KPI content:', error);
    return null;
  }
}

function parseKPIText(text: string, slug: string): ParsedKPI {
  const lines = text.split('\n');

  const result: ParsedKPI = {
    title: slugToTitle(slug),
    description: '',
  };

  let currentSection: string | null = null;
  let sectionContent: string[] = [];
  let beforeFirstSection: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for markdown section headers (######)
    if (trimmedLine.startsWith('######')) {
      // Process previous section
      if (currentSection) {
        processSection(result, currentSection, sectionContent);
      } else if (beforeFirstSection.length > 0) {
        // Content before first section is description + explanation
        processBeforeFirstSection(result, beforeFirstSection);
      }

      // Start new section
      const headerText = trimmedLine.replace(/^######\s*/, '').toLowerCase();
      if (headerText.includes('why') && headerText.includes('matter')) {
        currentSection = 'whyMatters';
      } else if (headerText.includes('what') && headerText.includes('good')) {
        currentSection = 'whatIsGood';
      } else if (headerText.includes('component')) {
        currentSection = 'components';
      }
      sectionContent = [];
      continue;
    }

    // Add content to appropriate section
    if (currentSection) {
      if (trimmedLine) {
        sectionContent.push(trimmedLine);
      }
    } else {
      // Before any markdown section
      beforeFirstSection.push(line);
    }
  }

  // Process last section
  if (currentSection) {
    processSection(result, currentSection, sectionContent);
  } else if (beforeFirstSection.length > 0) {
    processBeforeFirstSection(result, beforeFirstSection);
  }

  return result;
}

function processBeforeFirstSection(result: ParsedKPI, lines: string[]) {
  let inFormula = false;
  let formulaLines: string[] = [];
  let descriptionLines: string[] = [];
  let explanationLines: string[] = [];
  let exampleLines: string[] = [];
  let inExample = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for formula section
    if (trimmedLine === 'The formula is:') {
      inFormula = true;
      continue;
    }

    // Check for "or" divider in formula
    if (inFormula && trimmedLine === 'or') {
      continue;
    }

    // Check for Example section
    if (trimmedLine === 'Example') {
      inExample = true;
      inFormula = false;
      continue;
    }

    // Skip empty lines
    if (!trimmedLine) {
      if (inFormula) inFormula = false;
      continue;
    }

    // Collect content
    if (inFormula) {
      formulaLines.push(trimmedLine);
    } else if (inExample) {
      exampleLines.push(trimmedLine);
    } else if (!result.description) {
      // First non-empty line is description
      result.description = trimmedLine.replace(/\*\*/g, '');
    } else {
      // Everything else before formula is explanation
      explanationLines.push(trimmedLine);
    }
  }

  // Set formula
  if (formulaLines.length > 0) {
    result.formula = {
      title: 'The formula is:',
      equation: formulaLines.join(' ')
    };
  }

  // Set explanation
  if (explanationLines.length > 0) {
    result.explanation = explanationLines.join(' ').replace(/\*\*/g, '').replace(/#example/g, 'example');
  }

  // Set example
  if (exampleLines.length > 0) {
    const exampleItems: string[] = [];
    let conclusion = '';

    for (const line of exampleLines) {
      if (line.startsWith('This means') || line.startsWith('Therefore')) {
        conclusion = line;
      } else {
        exampleItems.push(line);
      }
    }

    if (exampleItems.length > 0) {
      result.example = {
        title: 'If a company has:',
        items: exampleItems,
        conclusion: conclusion || undefined
      };
    }
  }
}

function processSection(result: ParsedKPI, section: string, content: string[]) {
  const cleanContent = content.filter(line => line && line !== 'or');

  switch (section) {
    case 'whatIsGood':
      // Join all content together, then split into bullet items
      const fullText = cleanContent.join(' ');
      const items: string[] = [];

      // Split by lines starting with '-'
      for (const line of cleanContent) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-')) {
          items.push(trimmed.substring(1).trim().replace(/\*\*/g, ''));
        } else if (items.length > 0) {
          // Continuation of previous item
          items[items.length - 1] += ' ' + trimmed.replace(/\*\*/g, '');
        } else {
          // First line without bullet (like "This varies dramatically by industry:")
          items.push(trimmed.replace(/\*\*/g, ''));
        }
      }

      result.whatIsGood = {
        title: "What's considered good?",
        items: items
      };
      break;

    case 'whyMatters':
      const whyItems: { label: string; description?: string }[] = [];

      for (const line of cleanContent) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-')) {
          const content = trimmed.substring(1).trim();
          // Check for bold label
          const boldMatch = content.match(/\*\*(.*?)\*\*\s*-\s*(.*)/);
          if (boldMatch) {
            whyItems.push({
              label: boldMatch[1],
              description: boldMatch[2]
            });
          } else {
            // No description, just label
            whyItems.push({
              label: content.replace(/\*\*/g, '')
            });
          }
        }
      }

      result.whyMatters = {
        title: 'Why it matters',
        items: whyItems
      };
      break;

    case 'components':
      const componentItems: { label: string; description?: string }[] = [];

      for (const line of cleanContent) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-')) {
          const content = trimmed.substring(1).trim();
          const parts = content.split(' - ');
          componentItems.push({
            label: parts[0].replace(/\*\*/g, ''),
            description: parts[1] || undefined
          });
        } else {
          // Line without bullet
          const parts = trimmed.split(' - ');
          componentItems.push({
            label: parts[0].replace(/\*\*/g, ''),
            description: parts[1] || undefined
          });
        }
      }

      result.components = {
        title: 'Components to Analyze',
        items: componentItems
      };
      break;
  }
}

function slugToTitle(slug: string): string {
  const titleMap: Record<string, string> = {
    'net-margin': 'Net Margin',
    'roe': 'ROE (Return on Equity)',
    'roa': 'ROA (Return on Assets)',
    'gross-margin': 'Gross Margin',
    'operating-margin': 'Operating Margin',
    'roic': 'ROIC (Return on Invested Capital)',
    'free-cash-flow': 'Free Cash Flow',
    'fcf-yield': 'FCF Yield',
    'sbc-impact-on-fcf': 'SBC Impact on FCF',
    'pe-ratio': 'P/E Ratio (Price-to-Earnings)',
    'pb-ratio': 'P/B Ratio (Price-to-Book)',
    'ebitda': 'EBITDA',
    'ev': 'EV (Enterprise Value)',
    'debt-to-equity': 'Debt to Equity Ratio',
    'debt-to-assets': 'Debt to Assets Ratio',
    'current-ratio': 'Current Ratio',
    'cash-ratio': 'Cash Ratio',
    'revenue': 'Revenue',
    'net-income': 'Net Income',
    'operating-expenses': 'Operating Expenses',
    'cash-and-debt': 'Cash & Debt',
    'eps': 'EPS (Earnings Per Share)'
  };

  return titleMap[slug] || slug.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}
