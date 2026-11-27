interface MagicFindItemData {
	id?: string;
	type: string;
	[key: string]: unknown;
}

interface MagicFindCategoryData {
	id: string;
	name: string;
	items: MagicFindItemData[];
}

export class MagicFind {
	categories = $state<MagicFindCategory[]>([]);

	constructor(data?: MagicFindCategoryData[]) {
		if (data) {
			this.categories = data.map((seedCategory) => {
				const category = Object.assign(new MagicFindCategory(), {
					id: seedCategory.id,
					name: seedCategory.name
				});

				category.items = seedCategory.items.map((seedItem) => {
					let item: MagicFindItem;

					switch (seedItem.type) {
						case 'number':
							item = Object.assign(new MagicFindItemNumber(), seedItem);
							break;
						case 'select':
							item = Object.assign(new MagicFindItemSelect(), seedItem);
							break;
						case 'bool':
							item = Object.assign(new MagicFindItemBool(), seedItem);
							break;
						case 'radio':
							item = Object.assign(new MagicFindItemRadio(), seedItem);
							break;
						default:
							item = Object.assign(new MagicFindItem(), seedItem);
					}
					return item;
				});
				return category;
			});
		}
	}

	get total(): number {
		return this.categories.reduce(
			(total, category) => total + category.items.reduce((sum, item) => sum + item.total, 0),
			0
		);
	}
}

export class MagicFindCategory {
	id = '';
	name = '';
	open = $state(true);
	items = $state<MagicFindItem[]>([]);

	toggleOpen() {
		this.open = !this.open;
	}

	setCheckedRadio(): void {
		this.items.forEach((item) => {
			if (item instanceof MagicFindItemRadio) {
				item.checked = false;
			}
		});
	}
}

export class MagicFindItem {
	id = '';
	value = $state(0);
	description = '';
	type = 'bool';
	icons: string[] = [];
	names: [{ name: string; link: string }] = [{ name: '', link: '' }];

	get total(): number {
		return 0;
	}
}

export class MagicFindItemNumber extends MagicFindItem {
	multiplier = 1;

	override get total(): number {
		return this.value * this.multiplier;
	}
	setValue(newValue: number): void {
		this.value = newValue;
	}
}

export class MagicFindItemBool extends MagicFindItem {
	checked = $state(false);

	override get total(): number {
		return this.checked ? this.value : 0;
	}

	setChecked(newChecked: boolean): void {
		this.checked = newChecked;
	}
}

export class MagicFindItemRadio extends MagicFindItem {
	checked = $state(false);

	override get total(): number {
		if (!this.checked) return 0;
		return typeof this.value === 'string' ? Number.parseInt(this.value, 10) : this.value;
	}

	setChecked(newChecked: boolean, category: MagicFindCategory): void {
		category.setCheckedRadio();
		this.checked = newChecked;
	}
}

export class MagicFindItemSelect extends MagicFindItem {
	options: { value: number; description: string }[] = [{ value: 0, description: '' }];
	selected = $state(0);

	override get total(): number {
		return this.selected;
	}

	setSelected(newSelected: number): void {
		this.selected = newSelected;
	}
}
