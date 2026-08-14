import { NamingDictionary, WarehouseNode } from '@/types/warehouse';

export const DEFAULT_NAMING_DICTIONARY: NamingDictionary = {
  companyCodes: {
    SB: 'Công ty Cổ phần Sông Ba (SB)',
    DRS: 'Tập đoàn Năng lượng DakRoSa (DRS)',
  },
  factoryCodes: {
    KD: 'Nhà máy Thủy điện Khe Diên (KD)',
    HN: "Nhà máy Thủy điện Krông H'năng (HN)",
    DR: 'Nhà máy Thủy điện DakRoSa (DR)',
  },
  mainParts: {
    T: 'Tuabin (T)',
    G: 'Máy phát (G)',
    GV: 'Điều tốc (GV)',
    E: 'Kích từ (E)',
    W: 'Hệ thống nước kỹ thuật (W)',
    P: 'Hệ thống bảo vệ (P)',
    C: 'Hệ thống điều khiển (C)',
  },
  subParts: {
    S: 'Buồng xoắn (S)',
    Gu: 'Cánh hướng (Gu)',
    Sh: 'Trục chính (Sh)',
    Be: 'Ổ đỡ / Ổ hướng (Be)',
    Ro: 'Roăng làm kín (Ro)',
    LG: 'Chốt cánh hướng (LG)',
    Di: 'Ống xả (Di)',
    Vl: 'Van đĩa / Van cầu (Vl)',
  },
};

const INITIAL_WAREHOUSE_TREE: WarehouseNode[] = [
  {
    id: 'comp-1',
    tenantId: 'tenant-1',
    parentId: null,
    code: 'SB',
    name: 'Công ty Cổ phần Đầu tư Năng lượng Sông Ba',
    assetKind: 'company',
    symbol: 'SB-HQ',
    condition: 'operating',
    location: 'Tòa nhà Điều hành Trung tâm, TP. Đà Nẵng',
    specifications: 'Tổng công suất quản lý 250MW',
    manufacturer: 'Tập đoàn Sông Ba',
    children: [
      {
        id: 'fact-1',
        tenantId: 'tenant-1',
        parentId: 'comp-1',
        code: 'SB-KD',
        name: 'Nhà máy Thủy điện Khe Diên',
        assetKind: 'factory',
        symbol: 'KD-PLANT',
        condition: 'operating',
        location: 'Xã Quế Phong, Huyện Quế Sơn, Tỉnh Quảng Nam',
        specifications: 'Công suất 9MW (2 Tổ máy Francis)',
        manufacturer: 'Andritz Hydro / Dongfang',
        children: [
          {
            id: 'main-1',
            tenantId: 'tenant-1',
            parentId: 'fact-1',
            code: 'SB-KD-T',
            name: 'Tổ máy H1 - Phân hệ Tuabin',
            assetKind: 'main_equipment',
            symbol: 'T-H1',
            condition: 'operating',
            location: 'Nhà máy Khe Diên - Gian máy tầng hầm B1',
            specifications: 'Cột áp định mức H=120m, Lưu lượng Q=8.5 m3/s, Tốc độ 750 v/p',
            manufacturer: 'Harbin Electric',
            children: [
              {
                id: 'part-1',
                tenantId: 'tenant-1',
                parentId: 'main-1',
                code: 'SB-KD-T-S-01',
                name: 'Buồng xoắn Tuabin H1 (Spiral Case)',
                assetKind: 'part',
                symbol: 'S-01',
                condition: 'operating',
                location: 'Kho vật tư chính - Phân khu A - Kệ 01',
                specifications: 'Thép hợp kim Q345R hàn định hình, đường kính vào D=1200mm',
                manufacturer: 'Harbin Electric Machinery',
                schedules: [
                  {
                    id: 'sch-1',
                    frequency: 'day',
                    value: 'x',
                    taskName: 'Kiểm tra áp lực vỏ buồng xoắn và rò rỉ van xả cặn',
                    laborCount: 1,
                    startTime: '08:00',
                    finishTime: '08:30',
                    toolsNeeded: ['Đồng hồ đo áp suất cầm tay', 'Đèn pin chuyên dụng'],
                    assignedTeam: ['Nguyễn Văn Tuấn (KTV Vận hành)'],
                    nextDueDate: 'Hàng ngày',
                    workOrderMode: 'auto',
                    notes: 'Ghi chỉ số áp lực vào nhật ký ca',
                  },
                  {
                    id: 'sch-2',
                    frequency: 'month',
                    value: 'x',
                    taskName: 'Vệ sinh và bảo dưỡng van xả cát buồng xoắn',
                    laborCount: 2,
                    startTime: '08:00',
                    finishTime: '11:30',
                    toolsNeeded: ['Cờ lê lực 150Nm', 'Mỡ bôi trơn SKF LGMT 3'],
                    assignedTeam: ['Trần Văn Bình', 'Lê Hữu Đạt'],
                    nextDueDate: '15/09/2026',
                    workOrderMode: 'auto',
                    notes: 'Khóa van áp lực trước khi xả cặn',
                  },
                ],
                documents: [
                  { id: 'd1', name: 'Manual_Spiral_Case_KD.pdf', type: 'manual', fileUrl: '#', uploadedAt: '10/01/2026' },
                  { id: 'd2', name: 'CO_CQ_Thep_Q345R.pdf', type: 'cocq', fileUrl: '#', uploadedAt: '12/01/2026' },
                  { id: 'd3', name: 'Bien_Ban_Thu_Ap_Thuy_Luc.pdf', type: 'test_report', fileUrl: '#', uploadedAt: '15/01/2026' },
                ],
                crossPlantSpareAvailable: true,
                crossPlantSuggestions: [
                  {
                    plantName: "Nhà máy Thủy điện Krông H'năng (HN)",
                    warehouseName: 'Kho dự phòng trung tâm Pleiku',
                    partCode: 'SB-HN-T-S-01',
                    availableQty: 1,
                    matchRate: '100% Lắp lẫn trực tiếp',
                  },
                ],
                timeline: [
                  { date: '01/08/2026', event: 'Kiểm tra định kỳ tháng 8/2026 - Áp suất ổn định 1.2 MPa', type: 'inspection' },
                  { date: '15/05/2026', event: 'Bảo dưỡng tra mỡ van xả cặn', type: 'maintenance' },
                ],
                children: [],
              },
              {
                id: 'part-2',
                tenantId: 'tenant-1',
                parentId: 'main-1',
                code: 'SB-KD-T-Gu-01',
                name: 'Cánh hướng nước (Guide Vanes)',
                assetKind: 'part',
                symbol: 'Gu-01',
                condition: 'operating',
                location: 'Kho phụ tùng Tuabin - Kệ B2 - Ngăn 03',
                specifications: 'Thép không gỉ đúc ZG06Cr13Ni4Mo, gồm 16 cánh hướng',
                manufacturer: 'Andritz Hydro',
                schedules: [
                  {
                    id: 'sch-3',
                    frequency: 'week',
                    value: 'x',
                    taskName: 'Đo độ hở khe cánh hướng và kiểm tra chốt an toàn',
                    laborCount: 2,
                    startTime: '13:30',
                    finishTime: '16:00',
                    toolsNeeded: ['Thước lá căn lá Mitutoyo', 'Đồng hồ so'],
                    assignedTeam: ['Phạm Hùng Cường', 'Vũ Đức Thịnh'],
                    nextDueDate: 'Thứ 2 hàng tuần',
                    workOrderMode: 'auto',
                    notes: 'Đảm bảo độ hở khe hở đầu cánh < 0.15mm',
                  },
                ],
                documents: [
                  { id: 'd4', name: 'Huong_Dan_Can_Khe_Ho_Canh_Huong.pdf', type: 'manual', fileUrl: '#', uploadedAt: '05/02/2026' },
                ],
                children: [],
              },
              {
                id: 'part-3',
                tenantId: 'tenant-1',
                parentId: 'main-1',
                code: 'SB-KD-T-Sh-01',
                name: 'Trục chính Tuabin (Turbine Main Shaft)',
                assetKind: 'part',
                symbol: 'Sh-01',
                condition: 'operating',
                location: 'Gian máy - Vị trí kết nối máy phát',
                specifications: 'Thép rèn hợp kim 20SiMn, đường kính D=380mm, chiều dài L=3200mm',
                manufacturer: 'Harbin Heavy Machinery',
                schedules: [
                  {
                    id: 'sch-4',
                    frequency: 'quarter',
                    value: 'x',
                    taskName: 'Đo độ đảo trục và kiểm tra độ rung rung động',
                    laborCount: 2,
                    startTime: '08:00',
                    finishTime: '17:00',
                    toolsNeeded: ['Thiết bị đo rung Bently Nevada', 'Đồng hồ so từ tính'],
                    assignedTeam: ['Kỹ sư Chẩn đoán rung động'],
                    nextDueDate: '10/10/2026',
                    workOrderMode: 'auto',
                  },
                ],
                documents: [
                  { id: 'd5', name: 'Shaft_Alignment_Report_2026.pdf', type: 'test_report', fileUrl: '#', uploadedAt: '12/03/2026' },
                ],
                children: [
                  {
                    id: 'subpart-1',
                    tenantId: 'tenant-1',
                    parentId: 'part-3',
                    code: 'SB-KD-T-Sh-Ro-01',
                    name: 'Roăng làm kín trục Tuabin (Shaft Gasket Seal)',
                    assetKind: 'part',
                    symbol: 'Ro-01',
                    condition: 'standby',
                    location: 'Kho vật tư số 01 - Kệ A2 - Ngăn 04 (Vị trí lưu trữ sẵn)',
                    specifications: 'Vật liệu Carbon/PTFE chịu mài mòn, bôi trơn bằng nước kỹ thuật',
                    manufacturer: 'EagleBurgmann',
                    schedules: [
                      {
                        id: 'sch-5',
                        frequency: 'year',
                        value: 3,
                        taskName: 'Bảo trì thay roăng làm kín trục định kỳ',
                        laborCount: 2,
                        startTime: '07:30',
                        finishTime: '16:30',
                        toolsNeeded: ['Bộ vam chuyên dụng tháo roăng', 'Dụng cụ ép thủy lực', 'Bộ mỡ bôi trơn'],
                        assignedTeam: ['Nguyễn Văn A (Đội trưởng cơ khí)', 'Trần Văn B'],
                        nextDueDate: '15/12/2026 (Lần 3 trong năm)',
                        workOrderMode: 'auto',
                        notes: 'Ngắt hoàn toàn nước kỹ thuật trước khi tháo roăng',
                      },
                    ],
                    documents: [
                      { id: 'd6', name: 'EagleBurgmann_Seal_Datasheet.pdf', type: 'manual', fileUrl: '#', uploadedAt: '20/04/2026' },
                      { id: 'd7', name: 'Chung_Chi_Xuat_Xuong_Roang.pdf', type: 'cocq', fileUrl: '#', uploadedAt: '22/04/2026' },
                    ],
                    crossPlantSpareAvailable: true,
                    crossPlantSuggestions: [
                      {
                        plantName: "Nhà máy Thủy điện Krông H'năng (HN)",
                        warehouseName: 'Kho phụ tùng máy phát HN - Kệ C1',
                        partCode: 'SB-HN-T-Sh-Ro-02',
                        availableQty: 2,
                        matchRate: '100% (Quy cách tiêu chuẩn trục D=380mm)',
                      },
                    ],
                    timeline: [
                      { date: '10/06/2026', event: 'Thay thế định kỳ lần 2 - Kiểm tra độ mòn < 0.2mm', type: 'maintenance' },
                    ],
                    children: [],
                  },
                  {
                    id: 'subpart-2',
                    tenantId: 'tenant-1',
                    parentId: 'part-3',
                    code: 'SB-KD-T-Sh-Be-01',
                    name: 'Ổ đỡ / Ổ hướng trục Tuabin (Turbine Guide Bearing)',
                    assetKind: 'part',
                    symbol: 'Be-01',
                    condition: 'operating',
                    location: 'Vị trí bệ đỡ trục Tuabin',
                    specifications: 'Bạc babbitt đúc lót hợp kim SnSb11Cu6, bôi trơn dầu tuần hoàn',
                    manufacturer: 'Michell Bearings',
                    schedules: [
                      {
                        id: 'sch-6',
                        frequency: 'year',
                        value: 1,
                        taskName: 'Đại tu kiểm tra bề mặt bạc lót và thay dầu bôi trơn ISO VG 46',
                        laborCount: 4,
                        startTime: '08:00',
                        finishTime: '17:00',
                        toolsNeeded: ['Máy lọc dầu ly tâm', 'Thước panme đo khe hở', 'Cần cẩu trục 30T'],
                        assignedTeam: ['Đội Đại tu Cơ khí Tổng công ty'],
                        nextDueDate: 'Tháng 12 hàng năm',
                        workOrderMode: 'auto',
                      },
                    ],
                    documents: [
                      { id: 'd8', name: 'Michell_Bearing_Manual.pdf', type: 'manual', fileUrl: '#', uploadedAt: '11/02/2026' },
                    ],
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            id: 'main-2',
            tenantId: 'tenant-1',
            parentId: 'fact-1',
            code: 'SB-KD-G',
            name: 'Tổ máy H1 - Phân hệ Máy phát (Generator)',
            assetKind: 'main_equipment',
            symbol: 'G-H1',
            condition: 'operating',
            location: 'Nhà máy Khe Diên - Gian máy sàn tầng 1',
            specifications: 'Công suất S=5.5MVA, Điện áp 6.3kV, Cos phi=0.85, 50Hz',
            manufacturer: 'Harbin Generator Co.',
            children: [
              {
                id: 'part-4',
                tenantId: 'tenant-1',
                parentId: 'main-2',
                code: 'SB-KD-G-Be-01',
                name: 'Ổ đỡ máy phát (Generator Thrust Bearing)',
                assetKind: 'part',
                symbol: 'Be-02',
                condition: 'operating',
                location: 'Kho phụ tùng điện máy phát - Kệ 03',
                specifications: 'Ổ đỡ gối tự lựa babbitt tải trọng 80 tấn',
                manufacturer: 'Harbin Electric',
                schedules: [],
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 'fact-2',
        tenantId: 'tenant-1',
        parentId: 'comp-1',
        code: 'SB-HN',
        name: "Nhà máy Thủy điện Krông H'năng",
        assetKind: 'factory',
        symbol: 'HN-PLANT',
        condition: 'operating',
        location: 'Huyện Sông Hinh, Tỉnh Phú Yên / Đắk Lắk',
        specifications: 'Công suất 64MW (2 Tổ máy Francis)',
        manufacturer: 'Dongfang Electric',
        children: [
          {
            id: 'main-3',
            tenantId: 'tenant-1',
            parentId: 'fact-2',
            code: 'SB-HN-T',
            name: 'Tổ máy H1 - Tuabin Thủy lực HN',
            assetKind: 'main_equipment',
            symbol: 'T-H1-HN',
            condition: 'operating',
            location: 'Gian máy HN tầng hầm',
            specifications: 'Cột áp H=72m, Công suất 32MW',
            manufacturer: 'Dongfang Electric',
            children: [
              {
                id: 'part-5',
                tenantId: 'tenant-1',
                parentId: 'main-3',
                code: 'SB-HN-T-Sh-Ro-02',
                name: 'Roăng làm kín trục Tuabin HN (Dự phòng)',
                assetKind: 'part',
                symbol: 'Ro-02',
                condition: 'standby',
                location: 'Kho Tổng Krông Hnăng - Kệ dự phòng A1',
                specifications: 'Vật liệu Carbon/PTFE tiêu chuẩn D=380mm',
                manufacturer: 'EagleBurgmann',
                schedules: [],
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

class WarehouseService {
  private tree: WarehouseNode[] = INITIAL_WAREHOUSE_TREE;
  private dictionary: NamingDictionary = DEFAULT_NAMING_DICTIONARY;

  async getTree(): Promise<WarehouseNode[]> {
    return JSON.parse(JSON.stringify(this.tree));
  }

  async getDictionary(): Promise<NamingDictionary> {
    return JSON.parse(JSON.stringify(this.dictionary));
  }

  async saveDictionary(dict: NamingDictionary): Promise<NamingDictionary> {
    this.dictionary = { ...dict };
    return this.dictionary;
  }

  async addNode(newNode: Omit<WarehouseNode, 'id' | 'children'>): Promise<WarehouseNode> {
    const node: WarehouseNode = {
      ...newNode,
      id: `node-${Date.now()}`,
      children: [],
    };

    if (!node.parentId) {
      this.tree.push(node);
      return node;
    }

    const insertChild = (nodes: WarehouseNode[]): boolean => {
      for (const parent of nodes) {
        if (parent.id === node.parentId) {
          parent.children = parent.children || [];
          parent.children.push(node);
          return true;
        }
        if (parent.children && insertChild(parent.children)) {
          return true;
        }
      }
      return false;
    };

    insertChild(this.tree);
    return node;
  }

  async updateNode(id: string, updateData: Partial<WarehouseNode>): Promise<WarehouseNode | null> {
    const findAndUpdate = (nodes: WarehouseNode[]): WarehouseNode | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          nodes[i] = { ...nodes[i], ...updateData };
          return nodes[i];
        }
        if (nodes[i].children) {
          const res = findAndUpdate(nodes[i].children);
          if (res) return res;
        }
      }
      return null;
    };

    return findAndUpdate(this.tree);
  }

  async deleteNode(id: string): Promise<boolean> {
    const findAndDelete = (nodes: WarehouseNode[]): boolean => {
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx >= 0) {
        nodes.splice(idx, 1);
        return true;
      }
      for (const node of nodes) {
        if (node.children && findAndDelete(node.children)) {
          return true;
        }
      }
      return false;
    };

    return findAndDelete(this.tree);
  }

  generateCode(params: {
    companyCode: string;
    factoryCode: string;
    mainPartCode: string;
    subPartCodes: string[];
    sequenceNumber: string;
  }): string {
    const parts = [
      params.companyCode,
      params.factoryCode,
      params.mainPartCode,
      ...params.subPartCodes.filter(Boolean),
      params.sequenceNumber.padStart(2, '0'),
    ];
    return parts.filter(Boolean).join('-');
  }
}

export const warehouseService = new WarehouseService();
