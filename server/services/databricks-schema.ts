import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TableColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  size?: number | string;
  not_null?: boolean;
  partition_key?: string;
  default?: string;
  comment?: string;
}

interface TableOverview {
  table_name: string;
  comment: string;
  partition_key?: string;
  append_only?: boolean;
  cdf_enabled?: boolean;
}

interface SchemaLayer {
  catalog_schema: string[][];
  tables_overview: string[][];
  [tableName: string]: string[][];
}

interface DatabricksSchemas {
  'bronze-delta': SchemaLayer;
  'silver-delta': SchemaLayer;
  'config-delta': SchemaLayer;
}

class DatabricksSchemaService {
  private schemas: DatabricksSchemas | null = null;
  private schemaPath: string;

  constructor() {
    this.schemaPath = path.join(__dirname, '../data/databricks_schemas.json');
    this.loadSchemas();
  }

  private loadSchemas(): void {
    try {
      const data = fs.readFileSync(this.schemaPath, 'utf-8');
      this.schemas = JSON.parse(data);
      console.log('✓ Databricks schemas loaded successfully');
    } catch (error) {
      console.error('Failed to load Databricks schemas:', error);
      this.schemas = null;
    }
  }

  getAllSchemas(): DatabricksSchemas | null {
    return this.schemas;
  }

  getSchemaLayer(layer: 'bronze-delta' | 'silver-delta' | 'config-delta'): SchemaLayer | null {
    return this.schemas?.[layer] || null;
  }

  getTablesOverview(layer: 'bronze-delta' | 'silver-delta' | 'config-delta'): TableOverview[] {
    const schemaLayer = this.getSchemaLayer(layer);
    if (!schemaLayer || !schemaLayer.tables_overview) return [];

    const [headers, ...rows] = schemaLayer.tables_overview;
    return rows.map(row => ({
      table_name: row[0] as string,
      comment: row[1] as string,
      partition_key: row[2] as string,
      append_only: String(row[3]).toLowerCase() === 'true',
      cdf_enabled: String(row[4]).toLowerCase() === 'true'
    }));
  }

  getTableColumns(layer: 'bronze-delta' | 'silver-delta' | 'config-delta', tableName: string): TableColumn[] {
    const schemaLayer = this.getSchemaLayer(layer);
    if (!schemaLayer || !schemaLayer[tableName]) return [];

    const tableData = schemaLayer[tableName];
    const [, headers, ...rows] = tableData; // Skip first row (table title), get headers, then data

    return rows.map(row => ({
      table_name: row[0] as string,
      column_name: row[1] as string,
      data_type: row[2] as string,
      size: row[3],
      not_null: String(row[4]).toLowerCase() === 'true',
      partition_key: row[5] as string,
      default: row[6] as string,
      comment: row[7] as string
    })).filter(col => col.column_name); // Filter out empty rows
  }

  getAllTables(): Array<{ layer: string; table: TableOverview }> {
    if (!this.schemas) return [];

    const allTables: Array<{ layer: string; table: TableOverview }> = [];
    
    (['bronze-delta', 'silver-delta', 'config-delta'] as const).forEach(layer => {
      const tables = this.getTablesOverview(layer);
      tables.forEach(table => {
        allTables.push({ layer, table });
      });
    });

    return allTables;
  }

  searchTables(query: string): Array<{ layer: string; table: TableOverview; columns?: TableColumn[] }> {
    if (!this.schemas || !query) return [];

    const results: Array<{ layer: string; table: TableOverview; columns?: TableColumn[] }> = [];
    const lowerQuery = query.toLowerCase();

    (['bronze-delta', 'silver-delta', 'config-delta'] as const).forEach(layer => {
      const tables = this.getTablesOverview(layer);
      
      tables.forEach(table => {
        const tableNameMatch = table.table_name.toLowerCase().includes(lowerQuery);
        const commentMatch = table.comment?.toLowerCase().includes(lowerQuery);
        
        // Get columns for deeper search
        const columns = this.getTableColumns(layer, table.table_name);
        const columnMatch = columns.some(col => 
          col.column_name?.toLowerCase().includes(lowerQuery) ||
          col.comment?.toLowerCase().includes(lowerQuery)
        );

        if (tableNameMatch || commentMatch || columnMatch) {
          results.push({
            layer,
            table,
            columns: columnMatch ? columns : undefined
          });
        }
      });
    });

    return results;
  }

  getTableSchema(layer: 'bronze-delta' | 'silver-delta' | 'config-delta', tableName: string) {
    const columns = this.getTableColumns(layer, tableName);
    const tables = this.getTablesOverview(layer);
    const tableInfo = tables.find(t => t.table_name === tableName);

    return {
      table: tableInfo,
      columns,
      layer
    };
  }

  getCatalogInfo(layer: 'bronze-delta' | 'silver-delta' | 'config-delta') {
    const schemaLayer = this.getSchemaLayer(layer);
    if (!schemaLayer || !schemaLayer.catalog_schema) return null;

    const [headers, ...rows] = schemaLayer.catalog_schema;
    return rows.map(row => ({
      entity_type: row[0],
      name: row[1],
      parent: row[2],
      comment: row[3]
    }));
  }

  // Get all unique column types across all tables
  getColumnTypes(): string[] {
    if (!this.schemas) return [];

    const types = new Set<string>();
    
    (['bronze-delta', 'silver-delta', 'config-delta'] as const).forEach(layer => {
      const tables = this.getTablesOverview(layer);
      tables.forEach(table => {
        const columns = this.getTableColumns(layer, table.table_name);
        columns.forEach(col => {
          if (col.data_type) types.add(col.data_type);
        });
      });
    });

    return Array.from(types).sort();
  }

  // Get sample SQL query for a table
  getSampleQuery(layer: 'bronze-delta' | 'silver-delta' | 'config-delta', tableName: string, limit: number = 10): string {
    const columns = this.getTableColumns(layer, tableName);
    if (columns.length === 0) return '';

    const columnNames = columns.slice(0, 10).map(col => col.column_name).join(', ');
    const layerName = layer.replace('-delta', '');
    
    return `SELECT ${columnNames}\nFROM nh_ai.${layerName}.${tableName}\nLIMIT ${limit}`;
  }
}

// Singleton instance
let databricksSchemaService: DatabricksSchemaService | null = null;

export function getDatabricksSchemaService(): DatabricksSchemaService {
  if (!databricksSchemaService) {
    databricksSchemaService = new DatabricksSchemaService();
  }
  return databricksSchemaService;
}

export type { TableColumn, TableOverview, SchemaLayer, DatabricksSchemas };
