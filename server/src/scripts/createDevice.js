// npm run device:create -- "Ket sat 01"     tạo két mới
// npm run device:create -- --rotate 1       cấp lại khóa cho két #1 (khóa cũ hết hiệu lực)
// npm run device:create -- --list           xem danh sách két
// Server chỉ lưu sha256 của khóa nên khóa chỉ hiện MỘT lần: chép ngay vào DEVICE_KEY.
import { prisma } from '../prisma.js';
import { hashKey, newDeviceKey } from '../services/devices.js';

const args = process.argv.slice(2);

function printKey(device, key) {
  console.log(`\nKét #${device.id}: ${device.name}`);
  console.log('Dán dòng sau vào safety-box.ino (mục cấu hình):\n');
  console.log(`  #define DEVICE_KEY     "${key}"\n`);
  console.log('Khóa này sẽ không hiện lại. Mất khóa thì chạy lại với --rotate.');
}

try {
  if (args[0] === '--list') {
    const devices = await prisma.device.findMany({ orderBy: { id: 'asc' } });
    if (!devices.length) console.log('Chưa có két nào. Tạo bằng: npm run device:create -- "Ket sat 01"');
    for (const d of devices) {
      const seen = d.lastSeenAt ? d.lastSeenAt.toLocaleString('vi-VN') : 'chưa kết nối';
      console.log(`#${d.id}  ${d.name}  (${d.state ?? '-'}, lần cuối: ${seen})`);
    }
  } else if (args[0] === '--rotate') {
    const id = Number(args[1]);
    const key = newDeviceKey();
    const device = await prisma.device.update({ where: { id }, data: { apiKeyHash: hashKey(key) } }).catch(() => null);
    if (!device) throw new Error(`Không tìm thấy két #${args[1]}. Xem danh sách: npm run device:create -- --list`);
    printKey(device, key);
  } else {
    const name = args.join(' ').trim();
    if (!name) throw new Error('Cách dùng: npm run device:create -- "Ket sat 01"');
    const key = newDeviceKey();
    printKey(await prisma.device.create({ data: { name, apiKeyHash: hashKey(key) } }), key);
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
