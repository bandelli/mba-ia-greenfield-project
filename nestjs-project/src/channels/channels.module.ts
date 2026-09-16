import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelsController } from './channels.controller';
import { Channel } from './entities/channel.entity';
import { Subscription } from './entities/subscription.entity';
import { ChannelsService } from './channels.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [TypeOrmModule.forFeature([Channel, Subscription])],
  controllers: [ChannelsController],
  providers: [ChannelsService, SubscriptionService],
  exports: [TypeOrmModule, ChannelsService, SubscriptionService],
})
export class ChannelsModule {}
