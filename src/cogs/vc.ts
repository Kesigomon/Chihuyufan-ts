import { ApplicationCommandOptionType } from 'discord-api-types/v10'
import {Events, GuildChannel, InteractionReplyOptions, VoiceChannel} from 'discord.js'
import { client } from '..'
import { guildId } from '../constant'

const defaultNames = new Map([
    ['928983010081124393', 'VC'],
    ['953922831924731935', 'VC2'],
    ['1060436239561523320', 'VC3'],
    ['1060436262101712926', 'VC4'],
    ['1060436286164447292', 'VC5'],
    ['1060436329277694013', 'VC6'],
    ['1060436353696927864', 'VC7'],
    ['1060436385036767342', 'VC8'],
    ['1060436405060386847', 'VC9'],
    ['1060436424538734602', 'VC10'],
]);
const allChannelsId = [...defaultNames.keys()];
const vcCategoryId = "942783290572677121"
const hiddenVcCategoryId = "1062726985429827584"
client.on('commandsReset', async () => {
  client.application!.commands.create(
    {
      name: 'vc',
      description: '参加しているVCの名前を変更します',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'name',
          description: '今何してる？',
          required: true
        }
      ]
    },
    guildId
  )
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (
    !interaction.inCachedGuild() ||
    !interaction.isChatInputCommand() ||
    interaction.commandName !== 'vc'
  ){
    return
  }

  const name = interaction.options.getString('name', true)
  const channelId = interaction.member.voice.channelId
  const isEditable = !!channelId && defaultNames.has(channelId)
  const noDiff = name === interaction.member.voice.channel?.name
  let response: InteractionReplyOptions
  if (!channelId){
    response = { content: 'チャンネルに参加してください。', ephemeral: true }
  }
  else if(!isEditable){
    response = { content: '編集できないVCです。\n最近作られたVCであれば、開発者にお知らせください。', ephemeral: true }
  }
  else if (name === ''){
    response = { content: '名前を入力してください。', ephemeral: true }
  }
  else if (noDiff){
    response = { content: '既にその名前です。', ephemeral: true }
  }
  else {
    // VoiceChannelの名前変更のレートリミットにひっかかると、レスポンスが追いつかないときがあるので
    // deferReplyしてから、そのReplyを編集する形にしている。
    await interaction.deferReply()
    await interaction.member.voice.channel?.edit({ name })
    await interaction.editReply(`チャンネル名を\`${name}\`に変更しました。\n※10分のレートリミットがあります。`)
    return
  }
  await interaction.reply(response)
})

// client.on('messageCreate', async (message) => {
//   if (!message.content.startsWith('.vc')) return

//   const [prefix, ...nameArray] = message.content.split(' ')
//   const name = nameArray.join(' ')
//   if (prefix != '.vc') return
//   const joinedVC = voiceChannelsId.includes(message.member?.voice.channel?.id!)
//   const noDiff = name === message.member?.voice.channel?.name
//   let response: string | undefined

//   if (!joinedVC) response = 'チャンネルに参加してください。'
//   if (name === '') response = '名前を入力してください。'
//   if (noDiff) response = '既にその名前です。'
//   if (response === undefined) {
//     await message.member?.voice.channel?.edit({ name })
//     response = `チャンネル名を\`${name}\`に変更しました。\n※10分のレートリミットがあります。`
//   }
//   await message.channel.send(response)
// })

client.on('voiceStateUpdate', async (oldState) => {
  const channel = oldState.channel
  if (
    !channel ||
    channel.members.size !== 0
  ) {
    return
  }
  const defaultName = defaultNames.get(channel.id)
  if(defaultName && defaultName !== channel.name){
    await channel.edit({ name: defaultName })
  }
})
const isShowed = (channel: GuildChannel): boolean => {
  return channel.parentId === vcCategoryId
}

const setShow = async (channel: GuildChannel, show: boolean) => {
  if(show){
    await channel.edit({parent: vcCategoryId})
  }
  else{
    await channel.edit({parent: hiddenVcCategoryId})
  }
}

const onJoinVC = async (channel: VoiceChannel) => {
  const allChannels = allChannelsId
      .map((id) => channel.guild.channels.resolve(id))
      .filter((channel): channel is VoiceChannel =>channel instanceof VoiceChannel)
  const showedChannels = allChannels.filter(isShowed)
  const hiddenChannels = allChannels.filter((channel) => !isShowed(channel))
  // 表示されているVCのなかで空きがあればなにもしない
  if(showedChannels.every((channel) => channel.members.size === 0)){
    return
  }
  // 隠れているチャンネルを一つ選ぶ(VCが尽きたら何もできない)
  const newChannel = hiddenChannels.at(0)
  if(!newChannel){
    return
  }
  await setShow(newChannel, true);
}

const onLeaveVC = async (channel: VoiceChannel) => {
  // VC1なら無視する
  if(channel.id === allChannelsId[0]){
    return
  }
  const allChannels = allChannelsId
      .map((id) => channel.guild.channels.resolve(id))
      .filter((channel): channel is VoiceChannel =>channel instanceof VoiceChannel)
  const showedChannels = allChannels.filter(isShowed)
  // 表示されているVCの中で空いているVCが２つ以上あれば、退出したVCは非表示にする
  if(showedChannels.filter((channel) => channel.members.size === 0).length <= 1){
    return
  }
  await setShow(channel, false);
}
client.on('voiceStateUpdate', async (oldState, newState) => {
  if(oldState.channel instanceof VoiceChannel){
    await onLeaveVC(oldState.channel)
  }
  if(newState.channel instanceof VoiceChannel){
    await onJoinVC(newState.channel)
  }
});