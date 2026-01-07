import { PrismaClient, Role, AppointmentStatus, PaymentMethod, InvoiceStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu cho chức năng chia ca...')

  // 1. Tạo Owner
  const hashedPassword = await bcrypt.hash('123456', 10)
  const owner = await prisma.user.upsert({
    where: { email: 'owner@salon.com' },
    update: {},
    create: {
      name: 'Chủ Salon',
      email: 'owner@salon.com',
      password: hashedPassword,
      phone: '0901234567',
      role: Role.OWNER,
    },
  })
  console.log('✅ Đã tạo Owner:', owner.name)

  // 2. Tạo Salon
  const salon = await prisma.salon.upsert({
    where: { slug: 'nami-nail-salon' },
    update: {},
    create: {
      name: 'Nami Nail Salon',
      slug: 'nami-nail-salon',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      phone: '0281234567',
      ownerId: owner.id,
    },
  })
  console.log('✅ Đã tạo Salon:', salon.name)

  // 3. Tạo giờ làm việc cho salon (Thứ 2 - Chủ nhật: 9:00 - 18:00)
  const daysOfWeek = [1, 2, 3, 4, 5, 6, 0] // Thứ 2 đến Chủ nhật
  for (const day of daysOfWeek) {
    await prisma.salonWorkingHours.upsert({
      where: {
        salonId_dayOfWeek: {
          salonId: salon.id,
          dayOfWeek: day,
        },
      },
      update: {},
      create: {
        salonId: salon.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        isOpen: true,
      },
    })
  }
  console.log('✅ Đã tạo giờ làm việc cho salon')

  // 4. Tạo Staff (Nhân viên)
  const staffNames = [
    { name: 'Nguyễn Thị Lan', phone: '0901111111' },
    { name: 'Trần Văn Hùng', phone: '0902222222' },
    { name: 'Lê Thị Mai', phone: '0903333333' },
    { name: 'Phạm Văn Đức', phone: '0904444444' },
  ]

  const staffList = []
  for (const staffData of staffNames) {
    // Kiểm tra xem staff đã tồn tại chưa
    let staff = await prisma.staff.findFirst({
      where: {
        salonId: salon.id,
        phone: staffData.phone,
      },
    })

    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          name: staffData.name,
          phone: staffData.phone,
          salonId: salon.id,
        },
      })
    }
    staffList.push(staff)
  }
  console.log('✅ Đã tạo', staffList.length, 'nhân viên')

  // 5. Tạo Services (Dịch vụ)
  const services = [
    { name: 'Cắt móng tay', price: 50000, duration: 30 },
    { name: 'Sơn móng tay', price: 100000, duration: 45 },
    { name: 'Vẽ móng nghệ thuật', price: 200000, duration: 60 },
    { name: 'Chăm sóc móng tay', price: 150000, duration: 90 },
    { name: 'Đắp móng gel', price: 300000, duration: 120 },
  ]

  const serviceList = []
  for (const serviceData of services) {
    // Kiểm tra xem service đã tồn tại chưa
    let service = await prisma.service.findFirst({
      where: {
        salonId: salon.id,
        name: serviceData.name,
      },
    })

    if (!service) {
      service = await prisma.service.create({
        data: {
          name: serviceData.name,
          price: serviceData.price,
          duration: serviceData.duration,
          salonId: salon.id,
        },
      })
    }
    serviceList.push(service)
  }
  console.log('✅ Đã tạo', serviceList.length, 'dịch vụ')

  // 6. Tạo StaffService (Thời gian làm việc của mỗi thợ cho mỗi dịch vụ)
  for (const staff of staffList) {
    for (const service of serviceList) {
      await prisma.staffService.upsert({
        where: {
          staffId_serviceId: {
            staffId: staff.id,
            serviceId: service.id,
          },
        },
        update: {},
        create: {
          staffId: staff.id,
          serviceId: service.id,
          duration: service.duration, // Mặc định bằng duration của service
        },
      })
    }
  }
  console.log('✅ Đã tạo StaffService cho tất cả thợ và dịch vụ')

  // 7. Tạo StaffSchedule (Lịch làm việc - Thứ 2 đến Thứ 6: 9:00-18:00)
  for (const staff of staffList) {
    for (let day = 1; day <= 5; day++) {
      // Thứ 2 đến Thứ 6
      // Kiểm tra xem schedule đã tồn tại chưa (với date = null)
      const existingSchedule = await prisma.staffSchedule.findFirst({
        where: {
          staffId: staff.id,
          dayOfWeek: day,
          date: null,
        },
      })

      if (!existingSchedule) {
        await prisma.staffSchedule.create({
          data: {
            staffId: staff.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '18:00',
            breakStart: '12:00',
            breakEnd: '13:00',
            date: null, // Lịch định kỳ, không phải ca đặc biệt
          },
        })
      }
    }
  }
  console.log('✅ Đã tạo lịch làm việc cho nhân viên')

  // 8. Tạo StaffPriority (Thứ tự ưu tiên)
  for (let i = 0; i < staffList.length; i++) {
    // Kiểm tra xem priority đã tồn tại chưa
    let priority = await prisma.staffPriority.findUnique({
      where: { staffId: staffList[i].id },
    })

    if (!priority) {
      priority = await prisma.staffPriority.create({
        data: {
          staffId: staffList[i].id,
          salonId: salon.id,
          priorityOrder: i + 1, // 1, 2, 3, 4
          sortByRevenue: 'DESC',
          isActive: true,
        },
      })
    }
  }
  console.log('✅ Đã tạo thứ tự ưu tiên cho nhân viên')

  // 9. Tạo Customers (Khách hàng)
  const customers = [
    { name: 'Nguyễn Văn A', phone: '0911111111', email: 'customer1@test.com' },
    { name: 'Trần Thị B', phone: '0922222222', email: 'customer2@test.com' },
    { name: 'Lê Văn C', phone: '0933333333', email: 'customer3@test.com' },
    { name: 'Phạm Thị D', phone: '0944444444', email: 'customer4@test.com' },
    { name: 'Hoàng Văn E', phone: '0955555555', email: 'customer5@test.com' },
  ]

  const customerUsers = []
  const customerList = []

  for (const customerData of customers) {
    // Tạo User cho customer
    const customerUser = await prisma.user.upsert({
      where: { email: customerData.email },
      update: {},
      create: {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        password: hashedPassword,
        role: Role.CUSTOMER,
      },
    })
    customerUsers.push(customerUser)

    // Tạo Customer
    const customer = await prisma.customer.upsert({
      where: { userId: customerUser.id },
      update: {},
      create: {
        userId: customerUser.id,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email,
      },
    })
    customerList.push(customer)
  }
  console.log('✅ Đã tạo', customerList.length, 'khách hàng')

  // 10. Tạo Appointments với các trạng thái khác nhau
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Appointments hôm nay
  const appointments = []

  // PENDING appointments (chưa xác nhận)
  for (let i = 0; i < 2; i++) {
    const startTime = new Date(today)
    startTime.setHours(14 + i, 0, 0, 0) // 14:00, 15:00
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + serviceList[0].duration)

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customerList[i].id,
        customerName: customerList[i].name,
        customerPhone: customerList[i].phone,
        serviceId: serviceList[0].id,
        staffId: staffList[0].id,
        startTime,
        endTime,
        status: AppointmentStatus.PENDING,
        salonId: salon.id,
        notes: `Lịch hẹn test ${i + 1}`,
      },
    })
    appointments.push(appointment)
  }

  // CONFIRMED appointments (đã xác nhận, chưa đến giờ)
  for (let i = 0; i < 2; i++) {
    const startTime = new Date(today)
    startTime.setHours(16 + i, 0, 0, 0) // 16:00, 17:00
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + serviceList[1].duration)

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customerList[i + 1].id,
        customerName: customerList[i + 1].name,
        customerPhone: customerList[i + 1].phone,
        serviceId: serviceList[1].id,
        staffId: staffList[1].id,
        startTime,
        endTime,
        status: AppointmentStatus.CONFIRMED,
        salonId: salon.id,
        notes: `Lịch hẹn đã xác nhận ${i + 1}`,
      },
    })
    appointments.push(appointment)
  }

  // IN_PROGRESS appointment (đang làm)
  const inProgressStart = new Date(today)
  inProgressStart.setHours(10, 0, 0, 0)
  const inProgressEnd = new Date(inProgressStart)
  inProgressEnd.setMinutes(inProgressEnd.getMinutes() + serviceList[2].duration)

  const inProgressAppointment = await prisma.appointment.create({
    data: {
      customerId: customerList[2].id,
      customerName: customerList[2].name,
      customerPhone: customerList[2].phone,
      serviceId: serviceList[2].id,
      staffId: staffList[2].id,
      startTime: inProgressStart,
      endTime: inProgressEnd,
      status: AppointmentStatus.IN_PROGRESS,
      salonId: salon.id,
      startedAt: new Date(today.getTime() - 30 * 60 * 1000), // Bắt đầu 30 phút trước
      notes: 'Đang làm dịch vụ',
    },
  })
  appointments.push(inProgressAppointment)

  // COMPLETED appointments (đã hoàn thành hôm nay)
  for (let i = 0; i < 3; i++) {
    const startTime = new Date(today)
    startTime.setHours(9 + i, 0, 0, 0) // 9:00, 10:00, 11:00
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + serviceList[i % serviceList.length].duration)
    const completedAt = new Date(endTime)

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customerList[i].id,
        customerName: customerList[i].name,
        customerPhone: customerList[i].phone,
        serviceId: serviceList[i % serviceList.length].id,
        staffId: staffList[i % staffList.length].id,
        startTime,
        endTime,
        status: AppointmentStatus.COMPLETED,
        salonId: salon.id,
        startedAt: startTime,
        completedAt,
        notes: `Đã hoàn thành ${i + 1}`,
      },
    })
    appointments.push(appointment)

    // Tạo Invoice cho appointment đã hoàn thành
    const service = serviceList[i % serviceList.length]
    const totalAmount = service.price
    const discount = 0
    const finalAmount = totalAmount - discount

    await prisma.invoice.create({
      data: {
        customerId: customerList[i].id,
        salonId: salon.id,
        appointmentId: appointment.id,
        totalAmount,
        discount,
        finalAmount,
        paymentMethod: PaymentMethod.CASH,
        status: InvoiceStatus.PAID,
        items: {
          create: {
            serviceId: service.id,
            quantity: 1,
            unitPrice: service.price,
            totalPrice: service.price,
          },
        },
      },
    })
  }
  console.log('✅ Đã tạo', appointments.length, 'lịch hẹn với các trạng thái khác nhau')

  // 11. Tạo thêm appointments cho ngày mai (CONFIRMED)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  for (let i = 0; i < 3; i++) {
    const startTime = new Date(tomorrow)
    startTime.setHours(10 + i * 2, 0, 0, 0) // 10:00, 12:00, 14:00
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + serviceList[i % serviceList.length].duration)

    await prisma.appointment.create({
      data: {
        customerId: customerList[i].id,
        customerName: customerList[i].name,
        customerPhone: customerList[i].phone,
        serviceId: serviceList[i % serviceList.length].id,
        staffId: staffList[i % staffList.length].id,
        startTime,
        endTime,
        status: AppointmentStatus.CONFIRMED,
        salonId: salon.id,
        notes: `Lịch hẹn ngày mai ${i + 1}`,
      },
    })
  }
  console.log('✅ Đã tạo thêm 3 lịch hẹn cho ngày mai')

  console.log('\n🎉 Hoàn thành seed dữ liệu!')
  console.log('\n📋 Thông tin đăng nhập:')
  console.log('   Email: owner@salon.com')
  console.log('   Password: 123456')
  console.log('\n📊 Dữ liệu đã tạo:')
  console.log(`   - 1 Salon: ${salon.name}`)
  console.log(`   - ${staffList.length} Nhân viên`)
  console.log(`   - ${serviceList.length} Dịch vụ`)
  console.log(`   - ${customerList.length} Khách hàng`)
  console.log(`   - ${appointments.length} Lịch hẹn (hôm nay)`)
  console.log(`   - 3 Lịch hẹn (ngày mai)`)
  console.log(`   - 3 Hóa đơn đã thanh toán`)
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

