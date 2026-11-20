export interface MenuItem {
  label: string;
  path: string;
  icon: string;
  description?: string;
  roles?: string[];
}

export interface MenuModule {
  name: string;
  items: MenuItem[];
}