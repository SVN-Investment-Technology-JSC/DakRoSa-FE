import {
  NamingDictionary,
  WarehouseNode,
  InventoryTransaction,
  InventoryStock,
} from '@/types/warehouse';

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
    specifications: 'Tổng công suất điều hành 250MW (Hệ thống 3 nhà máy thành viên)',
    manufacturer: 'Tập đoàn Sông Ba',
    children: [
      {
        id: 'fact-1',
        tenantId: 'tenant-1',
        parentId: 'comp-1',
        code: 'SB-KD',
        name: 'Nhà máy Thủy điện Khe Diên (Plant 1)',
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
            name: 'Phân hệ Tuabin Thủy lực H1 (Hydropower Turbine T1)',
            assetKind: 'main_equipment',
            symbol: 'T-H1',
            condition: 'operating',
            location: 'Nhà máy Khe Diên - Gian máy tầng hầm B1',
            specifications: 'Cột áp định mức H=120m, Lưu lượng Q=8.5 m3/s, Tốc độ 750 v/p',
            manufacturer: 'Harbin Electric Machinery',
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
                model: 'SB-KD-T-S-01',
                serialNumber: 'SB-HNT000001',
                material: 'Thép hợp kim Q345R',
                dimensions: 'D=1200mm, dày 28mm',
                operatingTemp: '5 - 45°C',
                pressureRating: '1.6 MPa',
                location: 'Kho vật tư chính - Phân khu A - Kệ 01',
                specifications: 'Thép hợp kim Q345R hàn định hình, đường kính vào D=1200mm',
                manufacturer: 'Harbin Electric Machinery',
                requiredTools: ['Cờ lê lực 150Nm', 'Đồng hồ đo áp suất cầm tay'],
                laborRequirement: '2 Workers',
                assignedTeam: 'Đội Cơ khí Thủy lực',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-s01',
                  itemCode: 'SB-KD-T-S-01',
                  itemName: 'Buồng xoắn Tuabin H1 (Spiral Case)',
                  unit: 'Bộ',
                  quantityOnHand: 1,
                  quantityReserved: 0,
                  quantityAvailable: 1,
                  minStock: 1,
                  maxStock: 2,
                  unitPrice: 450000000,
                  storageLocation: {
                    id: 'loc-1',
                    warehouseId: 'wh-kd',
                    warehouseName: 'Kho Vật Tư Khe Diên',
                    zone: 'Phân khu A',
                    shelf: 'Kệ 01',
                    bin: 'Ô Sàn 01',
                    fullAddress: 'Kho Khe Diên - Khu A - Kệ 01 - Ô Sàn 01',
                  },
                },
                transactions: [
                  {
                    id: 'tx-1',
                    transactionCode: 'NK-202601-001',
                    transactionType: 'IN',
                    itemCode: 'SB-KD-T-S-01',
                    itemName: 'Buồng xoắn Tuabin H1 (Spiral Case)',
                    quantity: 1,
                    unit: 'Bộ',
                    fromLocation: 'Nhà cung cấp Harbin Heavy',
                    toLocation: 'Kho Khe Diên - Khu A - Kệ 01',
                    referenceType: 'PURCHASE_ORDER',
                    referenceId: 'PO-2026-001',
                    requester: 'Trần Văn Bình',
                    approver: 'Nguyễn Văn Tuấn',
                    executor: 'Lê Hữu Đạt',
                    status: 'COMPLETED',
                    createdAt: '2026-01-15 09:30',
                  },
                ],
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
                    specRating: '100 MP/a',
                    statusNote: 'Dự phòng hoàn hảo',
                  },
                ],
                timeline: [
                  { date: '01/08/2026', event: 'Kiểm tra định kỳ tháng 8/2026 - Áp suất ổn định 1.2 MPa', type: 'inspection' },
                  { date: '15/05/2026', event: 'Bảo dưỡng tra mỡ van xả cặn', type: 'maintenance' },
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
                model: 'SB-KD-T-Sh-01',
                serialNumber: 'SB-HNT000003',
                material: 'Thép rèn hợp kim 20SiMn',
                dimensions: 'D=380mm, L=3200mm',
                operatingTemp: '-10 - 70°C',
                pressureRating: '500 kN.m Torque',
                location: 'Gian máy - Vị trí kết nối máy phát',
                specifications: 'Thép rèn hợp kim 20SiMn, đường kính D=380mm, chiều dài L=3200mm',
                manufacturer: 'Harbin Heavy Machinery',
                requiredTools: ['Thiết bị đo rung Bently Nevada', 'Đồng hồ so từ tính', 'Cẩu trục 30T'],
                laborRequirement: '4 Workers',
                assignedTeam: 'Đội Đại tu Cơ khí',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-sh01',
                  itemCode: 'SB-KD-T-Sh-01',
                  itemName: 'Trục chính Tuabin (Turbine Main Shaft)',
                  unit: 'Bộ',
                  quantityOnHand: 1,
                  quantityReserved: 0,
                  quantityAvailable: 1,
                  minStock: 1,
                  maxStock: 1,
                  unitPrice: 850000000,
                  storageLocation: {
                    id: 'loc-sh',
                    warehouseId: 'wh-kd',
                    warehouseName: 'Kho Khe Diên',
                    zone: 'Khu A',
                    shelf: 'Bệ lắp máy',
                    bin: 'Vị trí máy',
                    fullAddress: 'Nhà máy Khe Diên - Gian máy B1',
                  },
                },
                children: [
                  {
                    id: 'subpart-1',
                    tenantId: 'tenant-1',
                    parentId: 'part-3',
                    code: 'SB-KD-T-Sh-Ro-01',
                    name: 'SB-KD-T-Sh-Ro-01 (Shaft Sealing Ring)',
                    assetKind: 'part',
                    symbol: 'Ro-01',
                    condition: 'operating',
                    
                    // Exact details from main_UI.jpg
                    model: 'SB-KD-T-Sh-Ro-01',
                    serialNumber: 'SB-HNT000002',
                    material: 'Nitrile Rubber / Carbon PTFE',
                    dimensions: '120 × 12.9 mm × 15.20 mm',
                    operatingTemp: '-20 - 50°C',
                    pressureRating: '100 MP/a',
                    location: 'Kho vật tư số 01 - Kệ A2 - Tầng 2 - Ngăn 04',
                    specifications: 'Vòng roăng làm kín trục cao cấp Nitrile Rubber chịu mài mòn cao, bôi trơn nước kỹ thuật',
                    manufacturer: 'EagleBurgmann',
                    
                    requiredTools: ['Torque Wrench 150Nm', 'Vernier Caliper'],
                    laborRequirement: '2 Workers',
                    assignedTeam: 'Nguyễn Văn A (Đội trưởng cơ khí), Trần Văn B',
                    category: 'SPARE_PART',
                    
                    stock: {
                      itemId: 'item-ro01',
                      itemCode: 'SB-KD-T-Sh-Ro-01',
                      itemName: 'Roăng làm kín trục Tuabin (Shaft Sealing Ring)',
                      unit: 'Cái',
                      quantityOnHand: 3,
                      quantityReserved: 1,
                      quantityAvailable: 2,
                      minStock: 2,
                      maxStock: 6,
                      unitPrice: 18500000,
                      storageLocation: {
                        id: 'loc-ro1',
                        warehouseId: 'wh-kd',
                        warehouseName: 'Kho Vật tư Số 01 Khe Diên',
                        zone: 'Phân khu A',
                        shelf: 'Kệ A2 - Tầng 2',
                        bin: 'Ngăn 04',
                        fullAddress: 'Kho vật tư số 01 - Kệ A2 - Tầng 2 - Ngăn 04',
                      },
                    },
                    
                    transactions: [
                      {
                        id: 'tx-ro-1',
                        transactionCode: 'NK-202606-004',
                        transactionType: 'IN',
                        itemCode: 'SB-KD-T-Sh-Ro-01',
                        itemName: 'Roăng làm kín trục Tuabin (Shaft Sealing Ring)',
                        quantity: 4,
                        unit: 'Cái',
                        fromLocation: 'Nhà cung cấp EagleBurgmann VN',
                        toLocation: 'Kho KD - Kệ A2 - Ngăn 04',
                        referenceType: 'PURCHASE_ORDER',
                        referenceId: 'PO-2026-042',
                        requester: 'Phòng Kỹ thuật',
                        approver: 'Nguyễn Văn Tuấn (PGĐ Kỹ thuật)',
                        executor: 'Lê Hữu Đạt (Thủ kho)',
                        status: 'COMPLETED',
                        createdAt: '2026-06-10 14:15',
                        notes: 'Nhập lô hàng theo hợp đồng cung ứng định kỳ',
                      },
                      {
                        id: 'tx-ro-2',
                        transactionCode: 'XK-WO-202608-012',
                        transactionType: 'OUT',
                        itemCode: 'SB-KD-T-Sh-Ro-01',
                        itemName: 'Roăng làm kín trục Tuabin (Shaft Sealing Ring)',
                        quantity: 1,
                        unit: 'Cái',
                        fromLocation: 'Kho KD - Kệ A2 - Ngăn 04',
                        toLocation: 'Tổ máy H1 - Gian máy B1',
                        referenceType: 'WORK_ORDER',
                        referenceId: 'WO-2026-0815',
                        requester: 'Nguyễn Văn A (Đội trưởng cơ khí)',
                        approver: 'Nguyễn Văn Tuấn',
                        executor: 'Lê Hữu Đạt (Thủ kho)',
                        status: 'COMPLETED',
                        createdAt: '2026-08-01 08:45',
                        notes: 'Xuất thay thế định kỳ kỳ 2 cho Tổ máy H1',
                      },
                    ],

                    bomItems: [
                      {
                        id: 'bom-1',
                        code: 'OIL-SKF-LGMT3',
                        name: 'Mỡ bôi trơn làm kín SKF LGMT 3/0.4',
                        category: 'CONSUMABLE',
                        quantity: 1,
                        unit: 'Tuýp',
                        condition: 'Sẵn sàng trong kho',
                        stockStatus: 'available',
                      },
                      {
                        id: 'bom-2',
                        code: 'BOLT-M16-SS316',
                        name: 'Bộ bu lông siết mặt bích Inox 316 M16x60',
                        category: 'SPARE_PART',
                        quantity: 8,
                        unit: 'Bộ',
                        condition: 'Sẵn sàng trong kho',
                        stockStatus: 'available',
                      },
                    ],

                    schedules: [
                      {
                        id: 'sch-5',
                        frequency: 'year',
                        value: 3,
                        taskName: 'Bảo trì thay roăng làm kín trục định kỳ',
                        laborCount: 2,
                        startTime: '07:30',
                        finishTime: '16:30',
                        toolsNeeded: ['Torque Wrench 150Nm', 'Vernier Caliper', 'Dụng cụ ép thủy lực', 'Bộ mỡ bôi trơn'],
                        assignedTeam: ['Nguyễn Văn A (Đội trưởng cơ khí)', 'Trần Văn B'],
                        nextDueDate: '15/12/2026 (Lần 3 trong năm)',
                        workOrderMode: 'auto',
                        notes: 'Ngắt hoàn toàn nước kỹ thuật trước khi tháo roăng',
                      },
                      {
                        id: 'sch-5b',
                        frequency: 'month',
                        value: 'x',
                        taskName: 'Kiểm tra lưu lượng nước rò qua khe roăng trục',
                        laborCount: 1,
                        startTime: '08:00',
                        finishTime: '09:00',
                        toolsNeeded: ['Đồng hồ đo lưu lượng', 'Đèn rọi kiểm tra'],
                        assignedTeam: ['KTV Vận hành ca'],
                        nextDueDate: 'Hàng tháng',
                        workOrderMode: 'auto',
                      },
                    ],

                    documents: [
                      { id: 'd6', name: 'Manual.pdf', type: 'manual', fileUrl: '#', fileSize: '2.4 MB', uploadedAt: '20/04/2026' },
                      { id: 'd7', name: 'CO-CQ.pdf', type: 'cocq', fileUrl: '#', fileSize: '1.1 MB', uploadedAt: '22/04/2026' },
                      { id: 'd8', name: 'Test_Report.pdf', type: 'test_report', fileUrl: '#', fileSize: '3.8 MB', uploadedAt: '25/04/2026' },
                    ],

                    crossPlantSpareAvailable: true,
                    crossPlantSuggestions: [
                      {
                        plantName: "Nhà máy Thủy điện Krông H'năng (Plant 2)",
                        warehouseName: 'Kho phụ tùng máy phát HN - Kệ C1',
                        partCode: 'SB-HN-T-Sh-Ro-02',
                        availableQty: 1,
                        matchRate: '100% Lắp lẫn tương thích trực tiếp',
                        specRating: '2.5 kW / Standby',
                        statusNote: 'Manual Engineer Review & Transfer Approval required',
                      },
                    ],

                    timeline: [
                      { date: '01/08/2026', event: 'Xuất kho 1 cái phục vụ thay thế theo Lệnh WO-2026-0815', type: 'maintenance', reference: 'WO-2026-0815' },
                      { date: '10/06/2026', event: 'Nhập kho 4 cái theo hợp đồng cung ứng PO-2026-042', type: 'inspection', reference: 'PO-2026-042' },
                      { date: '15/03/2026', event: 'Kiểm định khe hở làm kín định kỳ Quý 1 - Đạt tiêu chuẩn', type: 'inspection' },
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
                    model: 'SB-KD-T-Sh-Be-01',
                    serialNumber: 'SB-HNT000004',
                    material: 'Bạc babbitt SnSb11Cu6',
                    dimensions: 'D=380mm, L=420mm',
                    operatingTemp: '30 - 65°C',
                    pressureRating: '2.5 MPa Oil Film',
                    location: 'Vị trí bệ đỡ trục Tuabin',
                    specifications: 'Bạc babbitt đúc lót hợp kim SnSb11Cu6, bôi trơn dầu tuần hoàn ISO VG 46',
                    manufacturer: 'Michell Bearings',
                    requiredTools: ['Máy lọc dầu ly tâm', 'Thước panme đo khe hở', 'Cần cẩu trục 30T'],
                    laborRequirement: '4 Workers',
                    assignedTeam: 'Đội Đại tu Cơ khí Tổng công ty',
                    category: 'SPARE_PART',
                    stock: {
                      itemId: 'item-be01',
                      itemCode: 'SB-KD-T-Sh-Be-01',
                      itemName: 'Ổ đỡ / Ổ hướng trục Tuabin (Turbine Guide Bearing)',
                      unit: 'Bộ',
                      quantityOnHand: 2,
                      quantityReserved: 0,
                      quantityAvailable: 2,
                      minStock: 1,
                      maxStock: 2,
                      unitPrice: 320000000,
                    },
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
            name: 'Phân hệ Máy phát Điện H1 (Generator G1)',
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
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-gbe01',
                  itemCode: 'SB-KD-G-Be-01',
                  itemName: 'Ổ đỡ máy phát (Generator Thrust Bearing)',
                  unit: 'Bộ',
                  quantityOnHand: 1,
                  quantityReserved: 0,
                  quantityAvailable: 1,
                  minStock: 1,
                  maxStock: 2,
                },
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
        name: "Nhà máy Thủy điện Krông H'năng (Plant 2)",
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
                name: 'Roăng làm kín trục Tuabin HN (Standby Unit)',
                assetKind: 'part',
                symbol: 'Ro-02',
                condition: 'standby',
                model: 'SB-HN-T-Sh-Ro-02',
                serialNumber: 'SB-HNT000009',
                material: 'Nitrile Rubber / Carbon PTFE',
                dimensions: '120 × 12.9 mm × 15.20 mm',
                operatingTemp: '-20 - 50°C',
                pressureRating: '100 MP/a',
                location: 'Kho Tổng Krông Hnăng - Kệ dự phòng A1 - Ngăn 02',
                specifications: 'Vật liệu Carbon/PTFE tiêu chuẩn D=380mm, 2.5 kW standby buffer',
                manufacturer: 'EagleBurgmann',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-hn-ro02',
                  itemCode: 'SB-HN-T-Sh-Ro-02',
                  itemName: 'Roăng làm kín trục Tuabin HN (Standby Unit)',
                  unit: 'Cái',
                  quantityOnHand: 1,
                  quantityReserved: 0,
                  quantityAvailable: 1,
                  minStock: 1,
                  maxStock: 3,
                },
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

  /**
   * Thêm giao dịch kho mới (Transaction-Driven theo plan_2.md & dexuat.md)
   * và tự động cập nhật số dư tồn kho On-Hand / Reserved / Available
   */
  async addTransaction(
    nodeId: string,
    transaction: Omit<InventoryTransaction, 'id' | 'createdAt'>
  ): Promise<InventoryTransaction> {
    const newTx: InventoryTransaction = {
      ...transaction,
      id: `tx-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    const node = await this.findNodeById(nodeId);
    if (node) {
      node.transactions = node.transactions || [];
      node.transactions.unshift(newTx);

      // Cập nhật số dư kho nếu có stock
      if (node.stock) {
        if (newTx.transactionType === 'IN' || newTx.transactionType === 'RETURN') {
          node.stock.quantityOnHand += newTx.quantity;
        } else if (newTx.transactionType === 'OUT' || newTx.transactionType === 'BORROW') {
          node.stock.quantityOnHand = Math.max(0, node.stock.quantityOnHand - newTx.quantity);
          if (newTx.referenceType === 'WORK_ORDER' && node.stock.quantityReserved > 0) {
            node.stock.quantityReserved = Math.max(0, node.stock.quantityReserved - newTx.quantity);
          }
        }
        node.stock.quantityAvailable = Math.max(
          0,
          node.stock.quantityOnHand - node.stock.quantityReserved
        );
      }

      // Thêm vào timeline
      node.timeline = node.timeline || [];
      node.timeline.unshift({
        date: new Date().toLocaleDateString('vi-VN'),
        event: `Giao dịch ${newTx.transactionType}: ${newTx.transactionCode} (${newTx.quantity} ${newTx.unit}) - ${newTx.notes || ''}`,
        type: newTx.transactionType === 'IN' ? 'inspection' : 'maintenance',
        reference: newTx.referenceId,
      });

      await this.updateNode(nodeId, node);
    }

    return newTx;
  }

  /**
   * Giữ chỗ vật tư cho Work Order (Reservation mechanism theo plan_2.md)
   */
  async reserveMaterial(nodeId: string, qty: number, workOrderId: string): Promise<boolean> {
    const node = await this.findNodeById(nodeId);
    if (!node || !node.stock) return false;

    if (node.stock.quantityAvailable < qty) {
      throw new Error(`Tồn kho khả dụng không đủ để giữ chỗ (Còn: ${node.stock.quantityAvailable}, Yêu cầu: ${qty})`);
    }

    node.stock.quantityReserved += qty;
    node.stock.quantityAvailable = node.stock.quantityOnHand - node.stock.quantityReserved;

    node.timeline = node.timeline || [];
    node.timeline.unshift({
      date: new Date().toLocaleDateString('vi-VN'),
      event: `Giữ chỗ ${qty} ${node.stock.unit} cho Lệnh bảo trì ${workOrderId}`,
      type: 'maintenance',
      reference: workOrderId,
    });

    await this.updateNode(nodeId, node);
    return true;
  }

  async findNodeById(id: string): Promise<WarehouseNode | null> {
    const walk = (nodes: WarehouseNode[]): WarehouseNode | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children?.length) {
          const res = walk(n.children);
          if (res) return res;
        }
      }
      return null;
    };
    return walk(this.tree);
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
